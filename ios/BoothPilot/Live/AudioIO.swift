import Foundation
import AVFoundation

/// Mic capture + speaker playback for the realtime voice loop.
///
/// Captures the iPad mic as mono 24 kHz PCM16 (what the OpenAI Realtime API wants) and
/// plays back streamed 24 kHz PCM16 with low latency. `.voiceChat` mode gives hardware
/// echo cancellation so the booth doesn't hear itself — essential for barge-in.
final class AudioIO {
    static let sampleRate: Double = 24_000

    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private var converter: AVAudioConverter?
    private var onCapture: ((Data) -> Void)?

    /// PCM16 mono @24k, interleaved — the wire format.
    private let wireFormat = AVAudioFormat(
        commonFormat: .pcmFormatInt16, sampleRate: AudioIO.sampleRate, channels: 1, interleaved: true)!
    /// Float mono @24k — what the engine plays back.
    private let playFormat = AVAudioFormat(
        standardFormatWithSampleRate: AudioIO.sampleRate, channels: 1)!

    func start(onCapture: @escaping (Data) -> Void) throws {
        self.onCapture = onCapture

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .voiceChat,
                                options: [.defaultToSpeaker, .allowBluetoothA2DP])
        try session.setActive(true)

        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: playFormat)

        let input = engine.inputNode
        let inputFormat = input.outputFormat(forBus: 0)
        converter = AVAudioConverter(from: inputFormat, to: wireFormat)

        input.installTap(onBus: 0, bufferSize: 2048, format: inputFormat) { [weak self] buffer, _ in
            self?.capture(buffer)
        }

        engine.prepare()
        try engine.start()
        player.play()
    }

    func stop() {
        engine.inputNode.removeTap(onBus: 0)
        player.stop()
        engine.stop()
        try? AVAudioSession.sharedInstance().setActive(false)
    }

    // MARK: Capture (hardware format → 24k PCM16)

    private func capture(_ buffer: AVAudioPCMBuffer) {
        guard let converter, let onCapture else { return }
        let ratio = AudioIO.sampleRate / buffer.format.sampleRate
        let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 1024
        guard let out = AVAudioPCMBuffer(pcmFormat: wireFormat, frameCapacity: capacity) else { return }

        var fed = false
        var error: NSError?
        converter.convert(to: out, error: &error) { _, status in
            if fed { status.pointee = .noDataNow; return nil }
            fed = true
            status.pointee = .haveData
            return buffer
        }
        guard error == nil, out.frameLength > 0,
              let channel = out.int16ChannelData else { return }
        let bytes = Int(out.frameLength) * MemoryLayout<Int16>.size
        onCapture(Data(bytes: channel[0], count: bytes))
    }

    // MARK: Playback (24k PCM16 → engine)

    /// Enqueue a chunk of 24 kHz PCM16 audio from the model.
    func enqueue(_ pcm16: Data) {
        let frames = pcm16.count / MemoryLayout<Int16>.size
        guard frames > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: playFormat, frameCapacity: AVAudioFrameCount(frames)),
              let dst = buffer.floatChannelData else { return }
        buffer.frameLength = AVAudioFrameCount(frames)
        pcm16.withUnsafeBytes { raw in
            let samples = raw.bindMemory(to: Int16.self)
            for i in 0..<frames { dst[0][i] = Float(samples[i]) / 32768.0 }
        }
        player.scheduleBuffer(buffer, completionHandler: nil)
    }

    /// Barge-in: drop everything queued and stop instantly.
    func flushPlayback() {
        player.stop()
        player.play()
    }
}
