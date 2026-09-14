// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TikkunCore",
    platforms: [.macOS(.v13)],
    products: [.library(name: "TikkunCore", targets: ["TikkunCore"])],
    targets: [
        .target(name: "TikkunCore", path: "Tikkun/Core"),
        .testTarget(name: "TikkunCoreTests", dependencies: ["TikkunCore"], path: "Tests")
    ]
)
