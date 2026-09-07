import { repository } from '../site'
import { formatStars, useGitHubStars } from '../useGitHubStars'
import DownloadButton from './DownloadButton'
import GitHubMark from './GitHubMark'
import Showcase from './Showcase'
import StarMark from './StarMark'

export default function Hero() {
  const stars = useGitHubStars()

  return (
    <section className="hero shell" aria-labelledby="hero-title">
      <div className="hero-copy rise">
        <h1 id="hero-title">
          <span className="hero-title-sites">Chess.com & Lichess.</span>
          <br />
          <em>On your desktop.</em>
        </h1>
        <div className="hero-actions" data-nosnippet="">
          <DownloadButton />
          <p className="download-note">Free & open source · Windows & Linux</p>
          <a className="source-link" href={repository} target="_blank" rel="noreferrer">
            <GitHubMark size={17} /> View on GitHub
            <span
              className={`star-count ${stars === null ? 'invisible' : ''}`}
              aria-hidden={stars === null}
            >
              <StarMark />
              {stars === null ? '0' : formatStars(stars)}
            </span>
          </a>
        </div>
      </div>
      <div className="hero-board rise">
        <Showcase />
      </div>
    </section>
  )
}
