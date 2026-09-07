import {
  ArrowDown,
  ArrowRight,
  Bell,
  ChevronDown,
  EyeOff,
  Gamepad2,
  MoveUpRight,
  Pin,
  Volume2,
} from 'lucide-react'
import DownloadButton from './components/DownloadButton'
import Footer from './components/Footer'
import GitHubMark from './components/GitHubMark'
import Hero from './components/Hero'
import Showcase from './components/Showcase'
import { repository, site } from './site'

const details = [
  {
    icon: EyeOff,
    title: 'Hide distractions',
    description: 'Hide chat and player ratings, or anonymise your opponent’s name and avatar.',
  },
  {
    icon: MoveUpRight,
    title: 'Numbered arrows',
    description: 'Right-click arrows are numbered in the order you draw them.',
  },
  {
    icon: Pin,
    title: 'Window controls',
    description:
      'Keep the window on top and your computer awake during games. The app remembers your last page, window size, and position.',
  },
  {
    icon: Bell,
    title: 'Native desktop notifications',
    description: 'Receive notifications from Chess.com and Lichess through your operating system.',
  },
  {
    icon: Gamepad2,
    title: 'Discord Rich Presence',
    description: 'Show your current Chess Desktop activity on your Discord profile.',
  },
  {
    icon: Volume2,
    title: 'Sound, shortcuts, and updates',
    description:
      'Adjust volume from the title bar and customise keyboard shortcuts. Updates install in the background.',
  },
]

const questions = [
  {
    question: 'What is Chess Desktop?',
    answer:
      'Chess Desktop is a free, open-source desktop client for Chess.com and Lichess. It brings the websites you already use into a dedicated app, with extra controls for focus, navigation, and game review.',
  },
  {
    question: 'Can I use my existing account?',
    answer:
      'Yes. Sign in to Chess.com or Lichess as you normally would. You can stay signed in to both and switch between them in the title bar.',
  },
  {
    question: 'Is it really free?',
    answer:
      'Yes. Chess Desktop is free and released under the MIT License. The sites’ own subscriptions and paid features still work as usual; the app does not include Chess.com Premium.',
  },
  {
    question: 'Which operating systems are supported?',
    answer:
      'Windows and Linux, on both x64 and ARM64. Windows uses an installer; Linux uses an AppImage. There is no macOS release at the moment.',
  },
  {
    question: 'Is this an official Chess.com or Lichess app?',
    answer:
      'No. Chess Desktop is an independent project and is not affiliated with Chess.com or Lichess.',
  },
]

function scrollToSection(id: 'root' | 'main' | 'features' | 'questions' | 'download') {
  const section = document.getElementById(id)
  section?.scrollIntoView({ block: 'start' })
  section?.focus({ preventScroll: true })

  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    )
  }
}

export default function App() {
  return (
    <>
      <button type="button" className="skip-link" onClick={() => scrollToSection('main')}>
        Skip to content
      </button>
      <header className="site-header">
        <div className="header-content shell">
          <button
            type="button"
            className="wordmark"
            onClick={() => scrollToSection('root')}
            aria-label="Chess Desktop home"
          >
            <img src="/logo.png" width={32} height={32} alt="" />
            {site.name}
          </button>
          <nav aria-label="Main navigation">
            <button type="button" onClick={() => scrollToSection('features')}>
              Features
            </button>
            <button type="button" onClick={() => scrollToSection('questions')}>
              Questions
            </button>
            <button
              type="button"
              className="header-download"
              onClick={() => scrollToSection('download')}
            >
              Get the app <ArrowDown size={14} aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Hero />
        <section
          className="features shell"
          id="features"
          tabIndex={-1}
          aria-labelledby="features-title"
        >
          <div className="section-intro">
            <h2 id="features-title">Desktop features</h2>
            <div className="settings-image">
              <Showcase
                loading="lazy"
                shots={[
                  {
                    src: '/app-settings.png',
                    label: 'App settings',
                    width: 711,
                    height: 532,
                    alt: 'Chess Desktop settings for hiding opponents, ratings and chat, numbered arrows, Lichess review, and Discord Rich Presence',
                  },
                ]}
              />
            </div>
          </div>
          <div className="feature-list">
            {details.map(({ icon: Icon, title, description }) => (
              <article key={title} className="feature-item">
                <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="review-section" aria-labelledby="review-title">
          <div className="shell review-layout">
            <div className="review-image">
              <Showcase
                loading="lazy"
                shots={[
                  {
                    src: '/lichess-analysis.png',
                    label: 'Lichess review',
                    width: 2560,
                    height: 1400,
                    alt: 'An imported Chess.com game on Lichess, showing the final position, move list, and computer analysis button',
                  },
                ]}
              />
            </div>
            <div className="review-copy">
              <h2 id="review-title">Review Chess.com games on Lichess.</h2>
              <p>
                Send a finished Chess.com game to Lichess in one click and start a free computer
                analysis.
              </p>
            </div>
          </div>
        </section>
        <section
          className="questions shell"
          id="questions"
          tabIndex={-1}
          aria-labelledby="questions-title"
        >
          <div>
            <h2 id="questions-title">Frequently asked questions</h2>
          </div>
          <div className="question-list">
            {questions.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          className="download-section shell"
          id="download"
          tabIndex={-1}
          aria-labelledby="download-title"
        >
          <div className="download-panel">
            <div>
              <h2 id="download-title">Download Chess Desktop</h2>
              <p>Free and open source. Available for Windows and Linux.</p>
            </div>
            <div className="download-actions" data-nosnippet="">
              <DownloadButton />
              <span className="download-note">Windows & Linux · x64 & ARM64</span>
            </div>
          </div>
          <a className="project-link" href={repository} target="_blank" rel="noreferrer">
            <GitHubMark size={18} />
            <span>Source code on GitHub</span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </section>
      </main>
      <Footer />
    </>
  )
}
