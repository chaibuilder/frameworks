export default function Page() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-30"></div>
      
      <div className="z-10 p-8 max-w-4xl w-full text-center">
        <h1 className="text-6xl font-bold mb-4 animate-fade-in">
          Chai Builder
        </h1>
        <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
          Create beautiful, responsive websites without writing a single line of code.
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
      
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-40 right-10 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute top-20 right-40 w-60 h-60 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>
  );
}
