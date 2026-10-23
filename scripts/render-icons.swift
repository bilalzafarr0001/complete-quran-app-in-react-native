// Renders the Falaq app icon + splash assets with CoreGraphics.
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

// Falaq palette: a dawn sky from plum to apricot, cream and peach-gold accents.
let PLUM = rgb(0x3A1630), ROSE = rgb(0x8E3457), APRICOT = rgb(0xE07B53)
let CREAM = rgb(0xFFF1E4), PEACH_LIGHT = rgb(0xFFD9AE), PEACH = rgb(0xFFC58A), PEACH_DEEP = rgb(0xF4A26B)

enum Shape { case square, rounded, circle }
/// Which parts of the mark to draw (the app's splash animates the sun separately).
enum Parts { case all, arch, sun }

/// Draws the dawn gradient (plum at the top → apricot at the bottom) over the canvas.
func drawBackground(_ c: CGContext, _ s: CGFloat) {
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    let g = CGGradient(colorsSpace: space, colors: [PLUM, ROSE, APRICOT] as CFArray, locations: [0, 0.6, 1])!
    // CoreGraphics is y-up: start at the top edge, end at the bottom.
    c.drawLinearGradient(g, start: CGPoint(x: s * 0.45, y: s), end: CGPoint(x: s * 0.55, y: 0),
                         options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    // Soft light rising from the horizon behind the mark.
    let glow = CGGradient(colorsSpace: space, colors: [rgb(0xFFC58A, 0.30), rgb(0xFFC58A, 0)] as CFArray, locations: [0, 1])!
    c.drawRadialGradient(glow, startCenter: CGPoint(x: s / 2, y: s * 0.3), startRadius: 0,
                         endCenter: CGPoint(x: s / 2, y: s * 0.3), endRadius: s * 0.5, options: [])
}

/// The Falaq mark: the sun rising inside an arch, drawn on a 120-unit design grid
/// (the mark spans x 22–98, y 22–90; its centre (60, 56) sits on the canvas centre).
/// `scale` = mark width relative to the canvas; `mono` draws solid white (themed icons).
func drawEmblem(_ c: CGContext, _ s: CGFloat, scale: CGFloat, mono: Bool = false, parts: Parts = .all) {
    let center = CGPoint(x: s / 2, y: s / 2)
    let f = s * scale / 76
    func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: center.x + (x - 60) * f, y: center.y - (y - 56) * f) }
    let space = CGColorSpace(name: CGColorSpace.sRGB)!

    func fill(_ path: CGPath, _ color: CGColor, gradient: CGGradient? = nil) {
        c.saveGState()
        c.addPath(path)
        if mono || gradient == nil {
            c.setFillColor(mono ? rgb(0xFFFFFF) : color)
            c.fillPath()
        } else {
            c.clip()
            let b = path.boundingBox
            c.drawLinearGradient(gradient!, start: CGPoint(x: b.midX, y: b.maxY), end: CGPoint(x: b.midX, y: b.minY), options: [])
        }
        c.restoreGState()
    }

    if parts != .arch {
        // Sun: clipped at the horizon in the icon; whole in the splash layer (it rises).
        c.saveGState()
        if parts == .all { c.clip(to: CGRect(x: 0, y: p(0, 88).y, width: s, height: s)) }
        let r = 19 * f
        let sun = CGPath(ellipseIn: CGRect(x: p(60, 88).x - r, y: p(60, 88).y - r, width: r * 2, height: r * 2), transform: nil)
        let sunGradient = CGGradient(colorsSpace: space, colors: [PEACH_LIGHT, PEACH, PEACH_DEEP] as CFArray, locations: [0, 0.5, 1])!
        fill(sun, PEACH, gradient: sunGradient)
        let rays = CGMutablePath()
        for (a, b) in [((60, 60), (60, 52)), ((40, 68), (35, 62)), ((80, 68), (85, 62)), ((40, 81), (35.5, 79.5)), ((80, 81), (84.5, 79.5))] {
            rays.move(to: p(CGFloat(a.0), CGFloat(a.1)))
            rays.addLine(to: p(CGFloat(b.0), CGFloat(b.1)))
        }
        fill(rays.copy(strokingWithWidth: 3 * f, lineCap: .round, lineJoin: .round, miterLimit: 4), PEACH)
        c.restoreGState()
    }

    if parts != .sun {
        // Pointed arch (mihrab) and the horizon line.
        let arch = CGMutablePath()
        arch.move(to: p(30, 88))
        arch.addLine(to: p(30, 58))
        arch.addQuadCurve(to: p(60, 22), control: p(30, 34))
        arch.addQuadCurve(to: p(90, 58), control: p(90, 34))
        arch.addLine(to: p(90, 88))
        fill(arch.copy(strokingWithWidth: 5 * f, lineCap: .butt, lineJoin: .round, miterLimit: 4), CREAM)
        let horizon = CGMutablePath()
        horizon.move(to: p(22, 88))
        horizon.addLine(to: p(98, 88))
        fill(horizon.copy(strokingWithWidth: 5 * f, lineCap: .round, lineJoin: .round, miterLimit: 4), CREAM)
    }
}

func render(_ name: String, size: Int, background: Bool, emblemScale: CGFloat, shape: Shape = .square,
            mono: Bool = false, opaque: Bool = false, parts: Parts = .all) {
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
    if emblemScale > 0 { drawEmblem(ctx, s, scale: emblemScale, mono: mono, parts: parts) }
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
// ---------- In-app splash layers (the sun rises behind the arch) ----------
for (suffix, k) in [("", 1), ("@2x", 2), ("@3x", 3)] {
    render("app/falaq-arch\(suffix).png", size: Int(160 * CGFloat(k)), background: false, emblemScale: 0.9, parts: .arch)
    render("app/falaq-sun\(suffix).png", size: Int(160 * CGFloat(k)), background: false, emblemScale: 0.9, parts: .sun)
}
print("done")
