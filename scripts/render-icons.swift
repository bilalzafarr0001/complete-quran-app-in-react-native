// Renders the Noor app icon + splash assets with CoreGraphics.
// Usage: swift render.swift <outputDir>
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."

func rgb(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255, alpha: a)
}

let GOLD_LIGHT = rgb(0xF3D98B), GOLD = rgb(0xD4AA3A), GOLD_DARK = rgb(0xB8891E)

enum Shape { case square, rounded, circle }

/// Draws the emerald gradient background over the whole canvas.
func drawBackground(_ c: CGContext, _ s: CGFloat) {
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    let g = CGGradient(colorsSpace: space,
                       colors: [rgb(0x06301F), rgb(0x0B5A40), rgb(0x13805C)] as CFArray,
                       locations: [0, 0.55, 1])!
    // ~160deg CSS gradient: top-left → bottom-right, slightly vertical.
    c.drawLinearGradient(g, start: CGPoint(x: s * 0.2, y: s), end: CGPoint(x: s * 0.8, y: 0),
                         options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    // Soft glow behind the emblem.
    let glow = CGGradient(colorsSpace: space, colors: [rgb(0xF1CF74, 0.22), rgb(0xF1CF74, 0)] as CFArray, locations: [0, 1])!
    c.drawRadialGradient(glow, startCenter: CGPoint(x: s / 2, y: s / 2), startRadius: 0,
                         endCenter: CGPoint(x: s / 2, y: s / 2), endRadius: s * 0.42, options: [])
}

/// Outline of an eight-pointed star (Rub el Hizb): 8 outer points, 8 inner corners.
func starPath(center: CGPoint, size: CGFloat) -> CGPath {
    let outer = size / 2
    let half = outer / sqrt(2)                   // half-side of each square
    let inner = half / cos(CGFloat.pi / 8)       // where the two squares cross
    let p = CGMutablePath()
    for i in 0..<16 {
        let angle = CGFloat(i) * CGFloat.pi / 8 - CGFloat.pi / 2
        let r = i % 2 == 0 ? outer : inner
        let pt = CGPoint(x: center.x + r * cos(angle), y: center.y + r * sin(angle))
        if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
    }
    p.closeSubpath()
    return p
}

/// The emblem: gold star outline, inner star, crescent and a small star.
/// `scale` = emblem size relative to the canvas; `mono` draws solid white (themed icons).
func drawEmblem(_ c: CGContext, _ s: CGFloat, scale: CGFloat, mono: Bool = false) {
    let center = CGPoint(x: s / 2, y: s / 2)
    let size = s * scale
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    let goldGradient = CGGradient(colorsSpace: space, colors: [GOLD_LIGHT, GOLD, GOLD_DARK] as CFArray, locations: [0, 0.5, 1])!

    func fillGold(_ path: CGPath, evenOdd: Bool = false) {
        c.saveGState()
        c.addPath(path)
        if mono {
            c.setFillColor(rgb(0xFFFFFF))
            c.fillPath(using: evenOdd ? .evenOdd : .winding)
        } else {
            c.clip(using: evenOdd ? .evenOdd : .winding)
            let b = path.boundingBox
            c.drawLinearGradient(goldGradient, start: CGPoint(x: b.minX, y: b.maxY), end: CGPoint(x: b.maxX, y: b.minY), options: [])
        }
        c.restoreGState()
    }

    // Outer star: thick gold outline (stroked → filled outline for gradient).
    let outer = starPath(center: center, size: size)
    let outerStroke = outer.copy(strokingWithWidth: size * 0.055, lineCap: .round, lineJoin: .round, miterLimit: 4)
    fillGold(outerStroke)

    // Inner star: thin outline.
    if !mono {
        let inner = starPath(center: center, size: size * 0.74)
        c.saveGState()
        c.addPath(inner)
        c.setStrokeColor(rgb(0xF1CF74, 0.45))
        c.setLineWidth(size * 0.018)
        c.strokePath()
        c.restoreGState()
    }

    // Crescent: big disc minus offset disc (even-odd).
    let R = size * 0.2
    let crescent = CGMutablePath()
    let cc = CGPoint(x: center.x - size * 0.02, y: center.y)
    crescent.addEllipse(in: CGRect(x: cc.x - R, y: cc.y - R, width: R * 2, height: R * 2))
    let r2 = R * 0.84
    let oc = CGPoint(x: cc.x + R * 0.42, y: cc.y + R * 0.16)
    crescent.addEllipse(in: CGRect(x: oc.x - r2, y: oc.y - r2, width: r2 * 2, height: r2 * 2))
    // Clip to the big disc so only the crescent (no sliver of the cut-out) remains.
    c.saveGState()
    c.addEllipse(in: CGRect(x: cc.x - R, y: cc.y - R, width: R * 2, height: R * 2))
    c.clip()
    fillGold(crescent, evenOdd: true)
    c.restoreGState()

    // Small star inside the crescent's opening.
    let small = starPath(center: CGPoint(x: center.x + size * 0.12, y: center.y + size * 0.06), size: size * 0.11)
    fillGold(small)
}

func render(_ name: String, size: Int, background: Bool, emblemScale: CGFloat, shape: Shape = .square,
            mono: Bool = false, opaque: Bool = false) {
    let s = CGFloat(size)
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                        bitmapInfo: opaque ? CGImageAlphaInfo.noneSkipLast.rawValue : CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.interpolationQuality = .high
    ctx.setShouldAntialias(true)
    switch shape {
    case .square: break
    case .rounded:
        ctx.addPath(CGPath(roundedRect: CGRect(x: 0, y: 0, width: s, height: s), cornerWidth: s * 0.22, cornerHeight: s * 0.22, transform: nil))
        ctx.clip()
    case .circle:
        ctx.addEllipse(in: CGRect(x: 0, y: 0, width: s, height: s))
        ctx.clip()
    }
    if background { drawBackground(ctx, s) }
    if emblemScale > 0 { drawEmblem(ctx, s, scale: emblemScale, mono: mono) }
    let image = ctx.makeImage()!
    let url = URL(fileURLWithPath: out).appendingPathComponent(name)
    try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, image, nil)
    CGImageDestinationFinalize(dest)
}

// ---------- Android ----------
let densities: [(String, CGFloat)] = [("mdpi", 1), ("hdpi", 1.5), ("xhdpi", 2), ("xxhdpi", 3), ("xxxhdpi", 4)]
for (d, k) in densities {
    let legacy = Int(48 * k), adaptive = Int(108 * k)
    render("android/mipmap-\(d)/ic_launcher.png", size: legacy, background: true, emblemScale: 0.62, shape: .rounded)
    render("android/mipmap-\(d)/ic_launcher_round.png", size: legacy, background: true, emblemScale: 0.6, shape: .circle)
    // Adaptive layers: emblem kept inside the 66dp safe zone of the 108dp canvas.
    render("android/mipmap-\(d)/ic_launcher_foreground.png", size: adaptive, background: false, emblemScale: 0.46)
    render("android/mipmap-\(d)/ic_launcher_background.png", size: adaptive, background: true, emblemScale: 0)
    render("android/mipmap-\(d)/ic_launcher_monochrome.png", size: adaptive, background: false, emblemScale: 0.46, mono: true)
    // Splash icon (Android 12+ draws it inside a 160dp circle on a 240dp canvas).
    render("android/drawable-\(d)/splash_icon.png", size: Int(240 * k), background: false, emblemScale: 0.5)
}
// Play Store listing icon (Google applies its own mask).
render("store/play-store-icon-512.png", size: 512, background: true, emblemScale: 0.62, opaque: true)

// ---------- iOS (no transparency allowed) ----------
for px in [40, 58, 60, 80, 87, 120, 180, 1024] {
    render("ios/AppIcon.appiconset/icon-\(px).png", size: px, background: true, emblemScale: 0.62, opaque: true)
}
for (suffix, k) in [("", 1), ("@2x", 2), ("@3x", 3)] {
    render("ios/SplashIcon.imageset/splash\(suffix).png", size: Int(160 * CGFloat(k)), background: false, emblemScale: 0.8)
}
print("done")
