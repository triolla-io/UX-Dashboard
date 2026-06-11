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
        <a href="https://triolla.io/" target="_blank" rel="noopener noreferrer"><img src={triollaLogo} alt="Triolla" className="nav-logo" /></a>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-avatar-group">
          <img src={avatarImg} alt="" className="hero-avatar-img" />
          <img src={welcomeImg} alt="Welcome!" className="hero-welcome-img" />
        </div>

        <h1 className="hero-title">
          Hi there! Get a real feedback<br /> on your dashboard design
        </h1>

        <p className="hero-subtitle">
          Upload a screenshot and get{' '}
          <strong>Expert AI Analysis</strong>{' '}AI trained on 250+ dashboard project we led in triolla.
        </p>

        <LoadingCard />

        <p className="trust-row">
          Free <span>·</span> No Commitment <span>·</span> Results in &lt; 60s
        </p>
      </section>
    </div>
  )
}
