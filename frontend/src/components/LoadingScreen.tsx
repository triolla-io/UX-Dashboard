import LoadingCard from './LoadingCard'
import triollaLogo from '../assests/triolla.svg'
import sparkIcon from '../assests/spark.svg'
export default function LoadingScreen() {
  return (
    <div>
      {/* Top Banner */}
      <div className="top-banner">
        <img src={sparkIcon} alt="" className="banner-spark" />
        Triolla AI Enterprise Dashboard Intelligence
      </div>

      {/* Nav */}
      <nav className="nav">
        <a href="https://triolla.io/" target="_blank" rel="noopener noreferrer"><img src={triollaLogo} alt="Triolla" className="nav-logo" /></a>
      </nav>

      {/* Hero */}
      <section className="hero">
        <p className="hero-subtitle">
          Hi there!
        </p>

        <h1 className="hero-title">
          Get a real feedback<br /> on your dashboard design
        </h1>

        <p className="hero-subtitle mb-3">
          Upload a screenshot and get <strong>Expert AI Analysis</strong> trained on 250+ dashboard projects we led in Triolla.
        </p>

        <LoadingCard />

        <p className="trust-row">
          Free <span>·</span> No Commitment <span>·</span> Results in &lt; 60s
        </p>
      </section>
    </div>
  )
}
