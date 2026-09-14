import SwiftUI
import CoreText

enum TorahFont {
    private(set) static var name = "Shlomo Stam"

    static func register() {
        guard let url = Bundle.main.url(forResource: "ShlomosemiStam", withExtension: "ttf") else { return }
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        if let descriptors = CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor],
           let first = descriptors.first {
            name = CTFontCopyPostScriptName(CTFontCreateWithFontDescriptor(first, 20, nil)) as String
        }
    }

    static func font(_ size: CGFloat) -> Font { .custom(name, fixedSize: size) }
}
