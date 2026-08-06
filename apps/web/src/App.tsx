import Footer from './components/Footer'
import Hero from './components/Hero'
import Showcase from './components/Showcase'

export default function App() {
  return (
    <>
      <main className="shell grid min-h-0 flex-1 grid-cols-1 content-center items-center gap-x-[clamp(32px,5vw,72px)] gap-y-[clamp(32px,5vh,56px)] py-[clamp(32px,6vh,64px)] wide:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
        <Hero />
        <Showcase />
      </main>

      <Footer />
    </>
  )
}
