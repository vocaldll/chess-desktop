import Footer from './components/Footer'
import Hero from './components/Hero'
import Showcase from './components/Showcase'

export default function App() {
  return (
    <>
      <main className="shell flex flex-1 flex-col items-center justify-center gap-y-[clamp(40px,6vh,64px)] py-[clamp(32px,5vh,56px)] text-center">
        <Hero />
        <Showcase />
      </main>

      <Footer />
    </>
  )
}
