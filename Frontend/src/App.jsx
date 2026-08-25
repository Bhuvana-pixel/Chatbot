import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const API_URL = `${API_BASE_URL}/ask`;
const LOGO = "/nec_logo.jpeg";

const referralOptions = [
  "Parent / Guardian",
  "Friend / Relative",
  "School Teacher",
  "NEC Student / Alumni",
  "Social Media / Internet",
  "Education Consultant",
  "Other",
];

const categories = [
  {
    id: "admissions",
    title: "Admissions",
    icon: "🎓",
    description: "Admission process, eligibility and documents",
    questions: [
      "What is the admission process at NEC?",
      "Is admission through TNEA?",
      "What are the eligibility criteria for admission?",
      "What documents are required during admission?",
      "How can I apply for admission to NEC?",
      "What is the procedure after receiving the TNEA allotment?",
      "What certificates are required during admission?",
      "What scholarships are available for students?",
      "What is the admission procedure for first-year students?",
      "Where can I get NEC admission information?",
      "How can I contact the NEC admission office?",
      "How can I reach National Engineering College?",
    ],
  },

  {
    id: "academics",
    title: "Academics",
    icon: "📚",
    description: "Courses, examinations and academic information",
    questions: [
      "What courses are offered at NEC?",
      "What engineering programmes are available at NEC?",
      "What departments are available at NEC?",
      "What are the academic regulations at NEC?",
      "What are the examination rules at NEC?",
      "What are the attendance requirements?",
      "How are internal marks calculated?",
      "What is the grading system at NEC?",
      "What is the examination procedure at NEC?",
      "What academic facilities are available?",
      "Where can I find academic information?",
      "What should students know about NEC academics?",
    ],
  },

  {
    id: "departments",
    title: "Departments",
    icon: "🏫",
    description: "Departments, programmes and faculty",
    questions: [
      "What departments are available at NEC?",
      "What programmes are offered by the CSE department?",
      "What is the Electronics and Communication Engineering department?",
      "What is the Mechanical Engineering department?",
      "What is the Electrical and Electronics Engineering department?",
      "What is the Civil Engineering department?",
      "What is the Information Technology department?",
      "Who are the heads of the departments?",
      "What facilities are available in the departments?",
      "What courses are offered by each department?",
      "How can I contact a department?",
      "Where can I find information about NEC departments?",
    ],
  },

  {
    id: "courses",
    title: "Courses",
    icon: "📖",
    description: "Engineering programmes and course information",
    questions: [
      "What B.E. programmes are offered at NEC?",
      "What B.Tech programmes are offered at NEC?",
      "What courses are available in computer science?",
      "What courses are available in electronics?",
      "What courses are available in mechanical engineering?",
      "What courses are available in electrical engineering?",
      "What courses are available in civil engineering?",
      "What courses are available in information technology?",
      "What postgraduate programmes are offered?",
      "What is the duration of the engineering programmes?",
      "What specializations are available?",
      "How can I choose a course at NEC?",
    ],
  },

  {
    id: "placements",
    title: "Placements",
    icon: "💼",
    description: "Placement opportunities, companies and statistics",
    questions: [
      "Does NEC provide placement opportunities?",
      "What are the placement statistics at NEC?",
      "Which companies visit NEC for placements?",
      "What is the highest salary package?",
      "What is the average salary package?",
      "How many students were placed last year?",
      "What companies recruit students from NEC?",
      "What placement training is provided?",
      "How does the placement process work?",
      "What are the placement statistics for 2026?",
      "What are the placement statistics for 2025?",
      "What are the placement statistics for 2024?",
      "What are the placement statistics for 2023?",
    ],
  },

  {
    id: "scholarships",
    title: "Scholarships",
    icon: "🏆",
    description: "Scholarships and financial assistance",
    questions: [
      "What scholarships are available at NEC?",
      "What is the Merit Scholarship?",
      "What is the Talent Scholarship?",
      "What is the Merit-cum-Means Scholarship?",
      "Is there a scholarship for sports students?",
      "Who is eligible for the Merit Scholarship?",
      "Who is eligible for the Talent Scholarship?",
      "What financial assistance is available?",
      "Is there a scholarship with college fee waiver?",
      "Is there a scholarship with hostel fee waiver?",
      "Is there a scholarship with transport fee waiver?",
      "How can I apply for a scholarship?",
    ],
  },

  {
    id: "campus",
    title: "Campus",
    icon: "🏛️",
    description: "Campus, facilities and student life",
    questions: [
      "What facilities are available at NEC?",
      "Does NEC have hostel facilities?",
      "Does NEC provide transport facilities?",
      "What sports facilities are available?",
      "What library facilities are available?",
      "What laboratories are available?",
      "Does NEC have a cafeteria?",
      "What student activities are available?",
      "What clubs are available at NEC?",
      "How can I reach NEC?",
      "Where is National Engineering College located?",
      "What campus facilities are available for students?",
    ],
  },
];

function App() {
  const [started, setStarted] = useState(false);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [referral, setReferral] = useState("");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAbout, setShowAbout] = useState(false);

  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  const canStart =
    name.trim() !== "" &&
    location.trim() !== "" &&
    referral !== "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const startChat = () => {
    if (!canStart) return;

    setStarted(true);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
  };

  const newChat = () => {
    setMessages([]);
    setInput("");
    setSelectedCategory(null);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const clearConversation = () => {
    setMessages([]);
    setInput("");
    setSelectedCategory(null);
  };

  const ask = async (question) => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || loading) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        text: cleanQuestion,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: cleanQuestion,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Backend returned ${response.status}`
        );
      }

      const data = await response.json();

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text:
            data.answer ||
            "I could not generate an answer.",
          sources: data.sources || [],
        },
      ]);
    } catch (error) {
      console.error("Chatbot error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text:
            "I couldn't connect to the NEC Assistant server. Please make sure the backend is running.",
          sources: [],
          error: true,
        },
      ]);
    } finally {
      setLoading(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      ask(input);
    }
  };

  const formatAnswer = (text) => {
    if (!text) {
      return null;
    }

    return text.split("\n").map((line, index) => {
      const value = line.trim();

      if (!value) {
        return (
          <div
            className="answer-space"
            key={index}
          />
        );
      }

      const numbered = value.match(
        /^(\d+)[.)]\s+(.*)$/
      );

      if (numbered) {
        return (
          <div
            className="answer-number"
            key={index}
          >
            <span>{numbered[1]}</span>

            <p>{numbered[2]}</p>
          </div>
        );
      }

      if (
        value.startsWith("•") ||
        value.startsWith("-") ||
        value.startsWith("*")
      ) {
        return (
          <div
            className="answer-bullet"
            key={index}
          >
            <span>•</span>

            <p>
              {value.replace(
                /^[•*-]\s*/,
                ""
              )}
            </p>
          </div>
        );
      }

      return (
        <p
          className="answer-text"
          key={index}
        >
          {value}
        </p>
      );
    });
  };

  const renderSources = (sources) => {
    if (
      !sources ||
      sources.length === 0
    ) {
      return null;
    }

    return (
      <div className="sources">

        <div className="sources-header">
          <span>📚</span>
          Sources used
        </div>

        <div className="sources-grid">

          {sources.map((source, index) => {
            const sourceName =
              typeof source === "string"
                ? source
                : source?.filename ||
                  source?.file ||
                  source?.document ||
                  `Source ${index + 1}`;

            return (
              <div
                className="source-card"
                key={index}
              >
                <span className="source-icon">
                  📄
                </span>

                <div>
                  <strong>
                    {sourceName}
                  </strong>

                  <small>
                    NEC Knowledge Base
                  </small>
                </div>
              </div>
            );
          })}

        </div>
      </div>
    );
  };

  /* =====================================================
     ONBOARDING
  ===================================================== */

  if (!started) {
    return (
      <div className="onboarding">

        <div className="onboarding-box">

          <div className="onboarding-logo">
            <img
              src={LOGO}
              alt="National Engineering College"
            />
          </div>

          <div className="college-name">
            NATIONAL ENGINEERING COLLEGE
          </div>

          <h1>
            Welcome to NEC Assistant
          </h1>

          <p className="welcome-text">
            Your intelligent guide to National
            Engineering College. Tell us a
            little about yourself to get started.
          </p>

          <div className="form-field">

            <label>
              What is your name?
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter your name"
              autoFocus
            />

          </div>

          <div className="form-field">

            <label>
              Where are you coming from?
            </label>

            <input
              type="text"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
              placeholder="Enter your city or district"
            />

          </div>

          <div className="form-field">

            <label>
              Who suggested NEC to you?
            </label>

            <div className="referral-grid">

              {referralOptions.map(
                (option) => (
                  <button
                    type="button"
                    key={option}
                    className={
                      referral === option
                        ? "referral-option selected"
                        : "referral-option"
                    }
                    onClick={() =>
                      setReferral(option)
                    }
                  >
                    <span className="radio-circle">
                      {referral === option
                        ? "✓"
                        : ""}
                    </span>

                    {option}
                  </button>
                )
              )}

            </div>

          </div>

          <button
            className={
              canStart
                ? "start-chat-button enabled"
                : "start-chat-button"
            }
            disabled={!canStart}
            onClick={startChat}
          >
            Start Chat
            <span>→</span>
          </button>

          <p className="privacy-text">
            Your information is used only for
            this chatbot session.
          </p>

        </div>

      </div>
    );
  }

  /* =====================================================
     MAIN APPLICATION
  ===================================================== */

  return (
    <div className="chat-app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="sidebar-content">

          <div className="sidebar-brand">

            <img
              src={LOGO}
              alt="National Engineering College"
            />

            <div>
              <strong>
                NEC Assistant
              </strong>

              <span>
                NATIONAL ENGINEERING COLLEGE
              </span>
            </div>

          </div>

          <button
            className="new-chat-button"
            onClick={newChat}
          >
            <span>＋</span>
            New Chat
          </button>

          <div className="explore-label">
            EXPLORE NEC
          </div>

          {categories.map((category) => (
            <button
              key={category.id}
              className="sidebar-category"
              onClick={() =>
                setSelectedCategory(category)
              }
            >
              <span className="sidebar-category-icon">
                {category.icon}
              </span>

              <span className="sidebar-category-name">
                {category.title}
              </span>

              <span className="sidebar-arrow">
                →
              </span>
            </button>
          ))}

        </div>

        <div className="sidebar-bottom">

          <div className="user-profile">

            <div className="user-avatar">
              {name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {name}
              </strong>

              <span>
                {location}
              </span>
            </div>

          </div>

          <button
            onClick={() => setShowAbout(true)}
          >
            ⓘ About NEC
          </button>

          <button
            onClick={clearConversation}
          >
            🗑 Clear Conversation
          </button>

          <div className="sidebar-footer">
            <span />
            NEC AI Assistant
          </div>

        </div>

      </aside>

      {/* MAIN */}

      <main className="main-area">

        {/* HEADER */}

        <header className="topbar">

          <div className="mobile-menu">
            ☰
          </div>

          <div className="topbar-brand">

            <div className="topbar-logo-wrapper">

              <img
                src={LOGO}
                alt="National Engineering College Logo"
              />

            </div>

            <div className="topbar-brand-text">

              <div className="topbar-title">
                NEC <span>Assistant</span>
              </div>

              <div className="topbar-subtitle">
                NATIONAL ENGINEERING COLLEGE
              </div>

            </div>

          </div>

          <div className="topbar-right">

            <div className="online-status">
              <span />
              Online
            </div>

            <button
              className="header-new-chat"
              onClick={newChat}
            >
              ＋ New Chat
            </button>

          </div>

        </header>

        {/* ABOUT NEC */}

        {showAbout && (
          <div
            className="about-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="About National Engineering College"
          >
            <div className="about-page">

              <div className="about-hero">

                <button
                  className="about-close"
                  onClick={() => setShowAbout(false)}
                  aria-label="Close About NEC"
                >
                  ×
                </button>

                <div className="about-hero-brand">
                  <img
                    src={LOGO}
                    alt="National Engineering College"
                  />
                </div>

                <div className="about-eyebrow">
                  NATIONAL ENGINEERING COLLEGE
                </div>

                <h1>
                  Engineering Education with
                  <span> Purpose, Innovation & Human Values</span>
                </h1>

                <p>
                  A closer look at NEC — its history, academic environment,
                  research culture, student opportunities, facilities and
                  vision for shaping responsible engineers.
                </p>

                <div className="about-hero-badges">
                  <span>Established 1984</span>
                  <span>Autonomous Institution</span>
                  <span>Kovilpatti, Tamil Nadu</span>
                </div>

              </div>

              <div className="about-body">

                <section className="about-section about-intro">
                  <div>
                    <span className="about-kicker">ABOUT NEC</span>
                    <h2>
                      More than a college — a place built around
                      learning, character and opportunity.
                    </h2>
                  </div>

                  <p>
                    National Engineering College was established in 1984
                    under the National Educational and Charitable Trust,
                    Kovilpatti. The institution was founded by
                    philanthropist and industrialist Thiru K. Ramasamy with
                    the aim of expanding access to quality technical
                    education and empowering students, particularly from
                    rural communities.
                  </p>

                  <p>
                    NEC has grown into an autonomous engineering institution
                    with academic departments, research activities,
                    laboratories, industry interaction and student-focused
                    development opportunities.
                  </p>
                </section>

                <section className="about-stat-grid">

                  <div className="about-stat-card">
                    <strong>1984</strong>
                    <span>Year of establishment</span>
                  </div>

                  <div className="about-stat-card">
                    <strong>8</strong>
                    <span>Academic departments listed by NEC</span>
                  </div>

                  <div className="about-stat-card">
                    <strong>UG + PG</strong>
                    <span>Engineering and technology programmes</span>
                  </div>

                  <div className="about-stat-card">
                    <strong>Ph.D.</strong>
                    <span>Research programmes and research centres</span>
                  </div>

                </section>

                <section className="about-section">
                  <span className="about-kicker">VISION & MISSION</span>

                  <div className="about-two-column">

                    <div className="about-feature-card vision-card">
                      <div className="about-feature-icon">✦</div>
                      <h3>Our Vision</h3>
                      <p>
                        Transforming lives through quality education
                        and research with human values.
                      </p>
                    </div>

                    <div className="about-feature-card">
                      <div className="about-feature-icon">◆</div>
                      <h3>Our Mission</h3>
                      <ul>
                        <li>
                          Maintain excellent infrastructure and highly
                          qualified, dedicated faculty.
                        </li>
                        <li>
                          Provide a learning environment that encourages
                          humanity, wisdom, creativity and team spirit.
                        </li>
                        <li>
                          Promote ethical behaviour and commitment to society.
                        </li>
                        <li>
                          Partner with academic, industrial and government
                          organisations for collaborative research.
                        </li>
                      </ul>
                    </div>

                  </div>
                </section>

                <section className="about-section about-highlight">
                  <div className="about-highlight-content">
                    <span className="about-kicker">WHY NEC?</span>
                    <h2>
                      Learn. Build. Research. Compete. Contribute.
                    </h2>
                    <p>
                      NEC's official profile highlights centres of excellence,
                      engineering laboratories, industry collaborations,
                      research opportunities, student training and project
                      exposure. These elements are designed to connect
                      classroom learning with practical engineering.
                    </p>
                  </div>

                  <div className="about-highlight-list">
                    <div>
                      <b>01</b>
                      <span>Strong academic foundation</span>
                    </div>
                    <div>
                      <b>02</b>
                      <span>Research and innovation culture</span>
                    </div>
                    <div>
                      <b>03</b>
                      <span>Industry interaction and training</span>
                    </div>
                    <div>
                      <b>04</b>
                      <span>Student clubs, competitions and activities</span>
                    </div>
                  </div>
                </section>

                <section className="about-section">
                  <span className="about-kicker">ACADEMIC ECOSYSTEM</span>
                  <h2 className="about-section-title">
                    Explore the different academic paths at NEC
                  </h2>

                  <div className="about-domain-grid">

                    <div>
                      <span>⚙️</span>
                      <h3>Engineering</h3>
                      <p>
                        Mechanical, Civil, EEE, ECE and other engineering
                        disciplines form the core academic ecosystem.
                      </p>
                    </div>

                    <div>
                      <span>💻</span>
                      <h3>Computing & Technology</h3>
                      <p>
                        CSE, Information Technology and Artificial
                        Intelligence & Data Science provide computing-focused
                        learning opportunities.
                      </p>
                    </div>

                    <div>
                      <span>🔬</span>
                      <h3>Research</h3>
                      <p>
                        NEC supports research through Ph.D. programmes,
                        research centres, laboratories and academic
                        collaboration.
                      </p>
                    </div>

                    <div>
                      <span>🚀</span>
                      <h3>Innovation & Entrepreneurship</h3>
                      <p>
                        Innovation initiatives, incubation activities and
                        industry-connected programmes help students explore
                        ideas beyond the classroom.
                      </p>
                    </div>

                  </div>
                </section>

                <section className="about-section">
                  <span className="about-kicker">DEPARTMENTS</span>
                  <h2 className="about-section-title">
                    A broad engineering and technology community
                  </h2>

                  <div className="about-department-grid">
                    {[
                      "Mechanical Engineering",
                      "Computer Science Engineering",
                      "Electronics & Communication Engineering",
                      "Electrical & Electronics Engineering",
                      "Civil Engineering",
                      "Information Technology",
                      "Artificial Intelligence & Data Science",
                      "Science & Humanities",
                    ].map((department) => (
                      <div
                        className="about-department-card"
                        key={department}
                      >
                        <span>✓</span>
                        {department}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="about-section">
                  <span className="about-kicker">CAMPUS & FACILITIES</span>

                  <div className="about-facility-grid">

                    <div>
                      <span>🏠</span>
                      <strong>Hostel Facilities</strong>
                      <p>Residential facilities for students.</p>
                    </div>

                    <div>
                      <span>🚌</span>
                      <strong>Transportation</strong>
                      <p>Transport facilities supporting campus access.</p>
                    </div>

                    <div>
                      <span>💡</span>
                      <strong>Innovation & Incubation</strong>
                      <p>Facilities and initiatives supporting student ideas.</p>
                    </div>

                    <div>
                      <span>💻</span>
                      <strong>Computing & E-Learning</strong>
                      <p>Computing infrastructure and digital learning support.</p>
                    </div>

                    <div>
                      <span>🍽️</span>
                      <strong>Cafeteria</strong>
                      <p>Campus food and refreshment facilities.</p>
                    </div>

                    <div>
                      <span>🏥</span>
                      <strong>Health Care</strong>
                      <p>Student health-care support on campus.</p>
                    </div>

                  </div>
                </section>

                <section className="about-section about-recognition">
                  <div>
                    <span className="about-kicker">RECOGNITION & QUALITY</span>
                    <h2>
                      A culture of academic quality and professional
                      development
                    </h2>
                    <p>
                      NEC's official accreditation information lists NBA
                      Tier I accreditation for B.E. Mechanical Engineering,
                      B.E. Electronics and Communication Engineering,
                      B.E. Computer Science and Engineering, B.E. Electrical
                      and Electronics Engineering, and B.Tech Information
                      Technology.
                    </p>
                  </div>

                  <div className="recognition-pill-grid">
                    <span>NBA Tier I</span>
                    <span>Autonomous</span>
                    <span>Research</span>
                    <span>Industry Collaboration</span>
                    <span>Innovation</span>
                    <span>Student Development</span>
                  </div>
                </section>

                <section className="about-section about-quote">
                  <div className="quote-mark">“</div>
                  <blockquote>
                    Transforming lives through quality education and
                    research with human values.
                  </blockquote>
                  <span>— NEC Vision</span>
                </section>

                <section className="about-contact">

                  <div>
                    <span className="about-kicker">VISIT NEC</span>
                    <h2>
                      Want to know more?
                    </h2>
                    <p>
                      National Engineering College (Autonomous)<br />
                      K.R. Nagar, Kovilpatti,<br />
                      Thoothukudi District – 628503, Tamil Nadu
                    </p>
                  </div>

                  <div className="about-contact-actions">
                    <a
                      href="https://nec.edu.in/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit Official NEC Website →
                    </a>

                    <button
                      onClick={() => setShowAbout(false)}
                    >
                      Back to NEC Assistant
                    </button>
                  </div>

                </section>

                <div className="about-source-note">
                  Information in this section is based on NEC's official
                  institutional pages and published accreditation/facility
                  information.
                </div>

              </div>

            </div>
          </div>
        )}

        {/* QUESTION PANEL */}

        {selectedCategory && (
          <div className="question-overlay">

            <div className="question-panel">

              <div className="question-panel-header">

                <div className="selected-category">

                  <div className="selected-category-icon">
                    {selectedCategory.icon}
                  </div>

                  <div>

                    <h2>
                      {selectedCategory.title}
                    </h2>

                    <p>
                      Choose a question to get
                      an instant answer
                    </p>

                  </div>

                </div>

                <button
                  className="close-panel"
                  onClick={() =>
                    setSelectedCategory(null)
                  }
                >
                  ×
                </button>

              </div>

              <div className="question-divider" />

              <div className="question-panel-intro">
                Popular questions students ask
              </div>

              <div className="question-list">

                {selectedCategory.questions.map(
                  (question, index) => (
                    <button
                      className="suggested-question"
                      key={index}
                      onClick={() => {
                        setSelectedCategory(
                          null
                        );

                        ask(question);
                      }}
                    >

                      <span className="question-number">
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <span className="question-text">
                        {question}
                      </span>

                      <span className="question-arrow">
                        →
                      </span>

                    </button>
                  )
                )}

              </div>

            </div>

          </div>
        )}

        {/* CHAT */}

        <div className="chat-content">

          {messages.length === 0 ? (

            <div className="welcome-chat">

              <div className="welcome-logo">

                <img
                  src={LOGO}
                  alt="National Engineering College"
                />

              </div>

              <div className="assistant-label">
                NEC INTELLIGENT ASSISTANT
              </div>

              <h1>
                How can I help you,
                <span> {name}?</span>
              </h1>

              <p className="welcome-chat-description">
                Ask about admissions, academics,
                departments, courses, placements,
                scholarships and campus facilities.
              </p>

              <div className="quick-question-title">
                WHAT WOULD YOU LIKE TO KNOW?
              </div>

              <div className="quick-category-grid">

                {categories.map((category) => (
                  <button
                    className="quick-category"
                    key={category.id}
                    onClick={() =>
                      setSelectedCategory(category)
                    }
                  >

                    <div className="quick-category-icon">
                      {category.icon}
                    </div>

                    <div className="quick-category-content">

                      <strong>
                        {category.title}
                      </strong>

                      <span>
                        {category.description}
                      </span>

                    </div>

                    <b>
                      →
                    </b>

                  </button>
                ))}

              </div>

            </div>

          ) : (

            <div className="conversation">

              {messages.map(
                (message, index) => (

                  <div
                    key={index}
                    className={
                      message.role === "user"
                        ? "message user-message"
                        : "message assistant-message"
                    }
                  >

                    {message.role === "user" ? (

                      <div className="user-message-container">

                        <span className="user-label">
                          You
                        </span>

                        <div className="user-bubble">
                          {message.text}
                        </div>

                      </div>

                    ) : (

                      <>

                        <div className="assistant-message-inner message-main">

                          <div className="assistant-header message-header">

                            <div className="assistant-avatar message-avatar">

                              <img
                                src={LOGO}
                                alt="NEC"
                              />

                            </div>

                            <div className="assistant-identity">

                              <strong>
                                NEC Assistant
                              </strong>

                              <span>
                                ✓ Verified
                              </span>

                            </div>

                          </div>

                          <div className="answer-box message-content">

                            {formatAnswer(
                              message.text
                            )}

                            {renderSources(
                              message.sources
                            )}

                          </div>



                        </div>

                      </>

                    )}

                  </div>

                )
              )}

              {loading && (

                <div className="message assistant-message">

                  <div className="assistant-message-inner message-main">

                    <div className="assistant-header message-header">

                      <div className="assistant-avatar message-avatar">

                        <img
                          src={LOGO}
                          alt="NEC"
                        />

                      </div>

                      <div className="assistant-identity">

                        <strong>
                          NEC Assistant
                        </strong>

                        <span>
                          ✓ Verified
                        </span>

                      </div>

                    </div>

                    <div className="thinking message-content">

                      <div className="thinking-dots">
                        <i />
                        <i />
                        <i />
                      </div>

                      <span>
                        Finding the best answer...
                      </span>

                    </div>

                  </div>

                </div>

              )}

              <div ref={bottomRef} />

            </div>

          )}

        </div>

        {/* COMPOSER */}

        <div className="composer-area">

          <div className="composer">

            <button
              type="button"
              className="composer-plus"
              aria-label="New message"
              onClick={() => inputRef.current?.focus()}
            >
              +
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about National Engineering College..."
              rows={1}
              disabled={loading}
              aria-label="Ask NEC Assistant"
            />

            <button
              type="button"
              className="send-button"
              disabled={
                loading ||
                !input.trim()
              }
              onClick={() => ask(input)}
              aria-label="Send message"
            >
              ↑
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

export default App;