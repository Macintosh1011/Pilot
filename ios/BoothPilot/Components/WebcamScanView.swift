import SwiftUI
import AVFoundation

/// Manages a single front-camera capture session for the conversation screen.
/// One instance is created per ConversationScreen lifetime (via @StateObject) and shared
/// between the full-pane preview and the PiP — both CameraPreviewView instances
/// connect separate AVCaptureVideoPreviewLayers to this same session.
///
/// Audio note: automaticallyConfiguresApplicationAudioSession is set to false so the
/// video-only session never touches Vapi's audio routing.
final class FrontCameraSession: NSObject, ObservableObject, AVCaptureMetadataOutputObjectsDelegate {
    let session = AVCaptureSession()
    /// Flips true once the session is running so previews can attach a rotation coordinator.
    @Published private(set) var isReady = false
    private var onCode: ((String) -> Void)?
    private var scanned = false
    private var configured = false

    func start(onCode: @escaping (String) -> Void) {
        guard !configured else { return }
        configured = true
        self.onCode = onCode
        // Video-only — keep Vapi's audio session untouched.
        session.automaticallyConfiguresApplicationAudioSession = false
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            guard granted else { return }
            self?.configure()
        }
    }

    /// Re-arm for the next visitor: allow a fresh QR scan without tearing the session down.
    func rearm() { scanned = false }

    private func configure() {
        guard
            let device = AVCaptureDevice.default(
                .builtInWideAngleCamera, for: .video, position: .front
            ),
            let input = try? AVCaptureDeviceInput(device: device),
            session.canAddInput(input)
        else { return }

        session.beginConfiguration()
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]
        }
        session.commitConfiguration()

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
            DispatchQueue.main.async { self?.isReady = true }
        }
    }

    func stop() {
        guard session.isRunning else { return }
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.stopRunning()
        }
    }

    // MARK: - AVCaptureMetadataOutputObjectsDelegate

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard
            !scanned,
            let obj = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
            let value = obj.stringValue
        else { return }
        scanned = true
        onCode?(value)
    }
}

/// A mirrored, gravity-upright preview that connects its AVCaptureVideoPreviewLayer to an
/// existing FrontCameraSession. Multiple instances can share the same session (full pane + PiP).
/// The iPad's front camera is portrait-mounted, so a raw preview renders sideways; an
/// `AVCaptureDevice.RotationCoordinator` keeps it upright and centered (resizeAspectFill).
struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession
    var mirrored: Bool = true

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        context.coordinator.attach(to: view.previewLayer)
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        context.coordinator.attach(to: uiView.previewLayer)
    }

    func makeCoordinator() -> Coordinator { Coordinator(mirrored: mirrored) }

    static func dismantleUIView(_ uiView: PreviewView, coordinator: Coordinator) {
        coordinator.detach()
    }

    final class Coordinator {
        private let mirrored: Bool
        private var rotationCoordinator: AVCaptureDevice.RotationCoordinator?
        private var observation: NSKeyValueObservation?

        init(mirrored: Bool) { self.mirrored = mirrored }

        func attach(to layer: AVCaptureVideoPreviewLayer) {
            guard rotationCoordinator == nil else { apply(to: layer); return }
            guard let device = layer.session?.inputs
                .compactMap({ ($0 as? AVCaptureDeviceInput)?.device })
                .first(where: { $0.hasMediaType(.video) })
            else { return }
            let coordinator = AVCaptureDevice.RotationCoordinator(device: device, previewLayer: layer)
            rotationCoordinator = coordinator
            apply(to: layer)
            observation = coordinator.observe(
                \.videoRotationAngleForHorizonLevelPreview, options: [.new]
            ) { [weak self, weak layer] _, _ in
                guard let layer else { return }
                DispatchQueue.main.async { self?.apply(to: layer) }
            }
        }

        private func apply(to layer: AVCaptureVideoPreviewLayer) {
            guard let conn = layer.connection else { return }
            if let angle = rotationCoordinator?.videoRotationAngleForHorizonLevelPreview,
               conn.isVideoRotationAngleSupported(angle) {
                conn.videoRotationAngle = angle
            }
            if mirrored, conn.isVideoMirroringSupported {
                conn.automaticallyAdjustsVideoMirroring = false
                conn.isVideoMirrored = true
            }
        }

        func detach() {
            observation?.invalidate()
            observation = nil
            rotationCoordinator = nil
        }
    }

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}
