export default function Page() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden relative text-white">
      {/* Gradient background div using CSS custom properties */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(135deg, #4f46e5 0%, #8b5cf6 50%, #ec4899 100%)",
        }}
      />

      {/* Content */}
      <div className="z-10 p-8 max-w-4xl w-full text-center">
        <h1
          className="text-6xl font-bold mb-4"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          Chai Builder
        </h1>
        <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
          Create beautiful, responsive websites. Low Code Website Builder.
        </p>

        <div className="flex gap-4 justify-center">
          <button className="px-6 py-3 bg-white text-purple-700 font-medium rounded-lg hover:bg-opacity-90 transition-all shadow-lg">
            Get Started
          </button>
          <button className="px-6 py-3 bg-transparent border-2 border-white font-medium rounded-lg hover:bg-white hover:bg-opacity-10 transition-all">
            Learn More
          </button>
        </div>
      </div>

      {/* Decorative elements with inline styles instead of animations */}
      <div
        className="absolute rounded-full opacity-20"
        style={{
          width: "16rem",
          height: "16rem",
          backgroundColor: "white",
          filter: "blur(100px)",
          bottom: "0",
          left: "0",
        }}
      />
      <div
        className="absolute rounded-full opacity-20"
        style={{
          width: "18rem",
          height: "18rem",
          backgroundColor: "#f9a8d4",
          filter: "blur(120px)",
          bottom: "10rem",
          right: "2.5rem",
        }}
      />
      <div
        className="absolute rounded-full opacity-20"
        style={{
          width: "15rem",
          height: "15rem",
          backgroundColor: "#a5b4fc",
          filter: "blur(100px)",
          top: "5rem",
          right: "10rem",
        }}
      />
    </div>
  );
}
