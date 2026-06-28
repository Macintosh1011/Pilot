import SwiftUI
import CoreImage.CIFilterBuiltins

/// A real, scannable QR rendered as ink modules on a transparent ground.
struct QRCodeView: View {
    let string: String

    var body: some View {
        if let image = Self.make(string) {
            Image(uiImage: image)
                .interpolation(.none)
                .resizable()
                .scaledToFit()
        } else {
            Color.clear
        }
    }

    private static func make(_ string: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        // ink modules, clear background
        let colored = output.applyingFilter("CIFalseColor", parameters: [
            "inputColor0": CIColor(red: 0.078, green: 0.078, blue: 0.075),
            "inputColor1": CIColor(red: 0, green: 0, blue: 0, alpha: 0),
        ])
        let context = CIContext(options: nil)
        guard let cg = context.createCGImage(colored, from: colored.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
