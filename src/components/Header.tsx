'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Left Side: Saiashish Healthcare */}
        <div className={styles.logoLeft}>
          <img 
            src="/images/logo-saiashish.jpg" 
            alt="Saiashish Healthcare Management" 
            className={styles.logoImage} 
          />
        </div>

        {/* Center: System Navigation */}
        <nav className={styles.navigation}>
          <Link 
            href="/" 
            className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>📋</span>
            Sample Entry
          </Link>
          <Link 
            href="/validator" 
            className={`${styles.navLink} ${pathname.startsWith('/validator') ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>🛡️</span>
            Validator Panel
          </Link>
        </nav>

        {/* Right Side: NTEP Logo */}
        <div className={styles.logoRight}>
          <img 
            src="/images/logo-ntep.jpg" 
            alt="National Tuberculosis Elimination Programme" 
            className={styles.logoImage} 
          />
        </div>
      </div>
    </header>
  );
}
