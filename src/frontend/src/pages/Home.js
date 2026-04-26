import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

const categories = [
    { name: 'Locuință', desc: 'Chirie, utilități, internet' },
    { name: 'Mâncare', desc: 'Restaurante, livrări, cumpărături' },
    { name: 'Transport', desc: 'Benzină, Uber, transport public' },
    { name: 'Distracție', desc: 'Ieșiri, concerte, cinema' },
    { name: 'Călătorii', desc: 'Vacanțe, excursii, cazare' },
    { name: 'Cumpărături', desc: 'Haine, electronice, cadouri' },
];

function Home() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="page">
            {/* Nav */}
            <nav className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
                <a href="#top" className="nav-logo">
                    <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="46" fill="#1a5c6b" stroke="#13444f" strokeWidth="4" />
                        <path d="M50 4 A46 46 0 0 1 96 50 L50 50 Z" fill="#7dd4c8" />
                        <path d="M96 50 A46 46 0 0 1 50 96 L50 50 Z" fill="#e8692a" />
                        <path d="M50 96 A46 46 0 0 1 4 50 L50 50 Z" fill="#f09a5e" />
                        <circle cx="50" cy="50" r="18" fill="#1a5c6b" />
                        <text x="50" y="57" textAnchor="middle" fill="#7dd4c8" fontSize="24" fontWeight="bold">$</text>
                    </svg>
                    <span>SplitMate</span>
                </a>
                <div className="nav-links">
                    <a href="#categories">Categorii</a>
                    <a href="#features">Funcționalități</a>
                    <a href="#how">Cum funcționează</a>
                    <Link to="/register" className="nav-btn">Începe acum</Link>
                </div>
            </nav>

            {/* Hero */}
            <header className="hero" id="top">
                <div className="hero-inner">
                    <h1>
                        Nu mai pierde timp<br />
                        cu <span className="accent">socoteala.</span>
                    </h1>
                    <p className="hero-desc">
                        Ai fost la o cină cu prietenii și nimeni nu știe cine a plătit ce?
                        SplitMate rezolvă asta — adaugi cheltuielile, selectezi cine participă,
                        și gata.
                    </p>
                    <div className="hero-btns">
                        <Link to="/register" className="btn-main">Creează un cont</Link>
                        <a href="#how" className="btn-ghost">Cum funcționează?</a>
                    </div>
                </div>
                <div className="hero-aside">
                    <div className="mini-card">
                        <div className="mini-card-top">
                            <span className="mini-card-label">Cină vineri</span>
                            <span className="mini-card-tag">3 pers.</span>
                        </div>
                        <div className="mini-card-amount">187 <small>RON</small></div>
                        <div className="mini-card-row">
                            <span className="avatar avatar--a">A</span>
                            <span className="avatar avatar--m">M</span>
                            <span className="avatar avatar--r">R</span>
                            <span className="mini-card-each">~62 RON / pers</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Categories */}
            <section className="section" id="categories">
                <div className="section-intro">
                    <h2>Pe ce dai banii?</h2>
                    <p>Categorii gata făcute ca să nu mai stai să te gândești unde să pui fiecare cheltuială.</p>
                </div>
                <div className="cat-grid">
                    {categories.map((cat, i) => (
                        <div className="cat-item" key={i}>
                            <h3>{cat.name}</h3>
                            <p>{cat.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="section section--alt" id="features">
                <div className="section-intro">
                    <h2>Ce poți face</h2>
                </div>
                <div className="feat-grid">
                    <div className="feat-item">
                        <div className="feat-num">01</div>
                        <h3>Împărțire automată</h3>
                        <p>
                            Pui suma, bifezi cine participă, restul se calculează singur.
                            Poți alege împărțire egală sau sume custom.
                        </p>
                    </div>
                    <div className="feat-item">
                        <div className="feat-num">02</div>
                        <h3>Grupuri de cheltuieli</h3>
                        <p>
                            Un grup pentru chirie, unul pentru weekend-uri, unul
                            pentru vacanța de vară. Fiecare cu oamenii lui.
                        </p>
                    </div>
                    <div className="feat-item">
                        <div className="feat-num">03</div>
                        <h3>Raport lunar</h3>
                        <p>
                            La final de lună, vezi pe ce ai cheltuit cel mai mult.
                            Nimic fancy, doar numere clare.
                        </p>
                    </div>
                    <div className="feat-item">
                        <div className="feat-num">04</div>
                        <h3>Notificări</h3>
                        <p>
                            Primești un mesaj când cineva adaugă o cheltuială sau
                            când e timpul să decontezi o datorie.
                        </p>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="section" id="how">
                <div className="section-intro">
                    <h2>Cum funcționează</h2>
                    <p>Fără tutoriale de 10 minute. Sunt literalmente 3 pași.</p>
                </div>
                <div className="steps">
                    <div className="step">
                        <span className="step-n">1</span>
                        <div>
                            <h3>Fă un grup</h3>
                            <p>Adaugă prietenii — pot fi 2 sau 20, nu contează.</p>
                        </div>
                    </div>
                    <div className="step">
                        <span className="step-n">2</span>
                        <div>
                            <h3>Adaugă cheltuieli</h3>
                            <p>Oricine din grup poate adăuga. Se vede instant la toți.</p>
                        </div>
                    </div>
                    <div className="step">
                        <span className="step-n">3</span>
                        <div>
                            <h3>Decontează</h3>
                            <p>SplitMate îți arată cine cui datorează. Trimiți banii și gata.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="cta" id="cta">
                <h2>Gata cu „îți dau eu mâine"</h2>
                <p>Fă-ți un cont gratuit și începe să împarți cheltuielile cum trebuie.</p>
                <div className="hero-btns" style={{ justifyContent: 'center' }}>
                    <Link to="/register" className="btn-main">Creează cont</Link>
                </div>
                <span className="cta-note">Gratuit. Nu cerem card.</span>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-left">
                    <span className="footer-name">SplitMate</span>
                    <span className="footer-copy">© 2026</span>
                </div>
                <div className="footer-right">
                    <a href="#categories">Categorii</a>
                    <a href="#features">Funcționalități</a>
                    <a href="#how">Cum funcționează</a>
                </div>
            </footer>
        </div>
    );
}

export default Home;
