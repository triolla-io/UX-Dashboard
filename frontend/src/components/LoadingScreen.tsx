import LoadingCard from './LoadingCard'
import triollaLogo from '../assests/triolla.svg'
import sparkIcon from '../assests/spark.svg'
import avatarImg from '../assests/avatar.png'
import welcomeImg from '../assests/welcome.png'

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
        <img src={triollaLogo} alt="Triolla" className="nav-logo" />
        <button className="nav-cta">Contact Us</button>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-avatar-group">
          <img src={avatarImg} alt="" className="hero-avatar-img" />
          <img src={welcomeImg} alt="Welcome!" className="hero-welcome-img" />
        </div>

        <h1 className="hero-title">
          Get an Instant UX Audit<br />of Your Dashboard
        </h1>

        <p className="hero-subtitle">
          Upload a screenshot and get{' '}
          <strong>Expert AI Analysis</strong>{' '}
          trained on hundreds of enterprise dashboards
        </p>

        <LoadingCard />

        <p className="trust-row">
          Free <span>·</span> No Commitment <span>·</span> Results in &lt; 60s
        </p>
      </section>
    </div>
  )
}
