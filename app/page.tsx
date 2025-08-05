import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Outbreak Simulator
        </h1>
        
        <div className="flex flex-col gap-4 w-full max-w-md">
          <Link
            href="/herd-immunity"
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium text-center rounded-lg transition-colors"
          >
            Calculate Herd Immunity Threshold
          </Link>
          
          <Link
            href="/outbreak-simulation"
            className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-medium text-center rounded-lg transition-colors"
          >
            Simulate Outbreak
          </Link>
        </div>
      </main>
    </div>
  );
}
