// ============================================================
// VaultPad — Landing Page JavaScript
// Handles workspace entry, animations, and interactions
// ============================================================

'use strict';

// ── Global Toast (Landing Page) ────────────────────────────
window.showToast = function (message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  const icons  = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info', warning: 'fa-circle-exclamation' };

  const toast = document.createElement('div');
  toast.className = 'toast-enter flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-[var(--border)] min-w-[260px] pointer-events-auto bg-[var(--bg-card)]';
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info}" style="color:${colors[type] || colors.info}"></i>
    <span class="text-sm font-medium text-[var(--text-primary)] flex-1">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.replace('toast-enter', 'toast-exit');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
};

document.addEventListener('DOMContentLoaded', () => {

  // ── Theme Init ───────────────────────────────────────────
  const savedTheme = localStorage.getItem('vaultpad-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'dark') document.documentElement.classList.add('dark');

  const themeToggles = [
    document.getElementById('theme-toggle'),
    document.getElementById('theme-toggle-mobile')
  ].filter(Boolean);

  themeToggles.forEach(btn => {
    const updateIcon = () => {
      const t = document.documentElement.getAttribute('data-theme');
      btn.querySelector('i').className = t === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    };
    updateIcon();
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      localStorage.setItem('vaultpad-theme', next);
      themeToggles.forEach(b => {
        b.querySelector('i').className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      });
    });
  });

  // ── Workspace Entry ──────────────────────────────────────
  const handleEntry = async (code, btn, errorEl) => {
    const trimmed = (code || '').trim();
    if (trimmed.length < 3) {
      if (errorEl) { errorEl.classList.remove('hidden'); setTimeout(() => errorEl.classList.add('hidden'), 3000); }
      return;
    }

    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Entering...';
    btn.disabled = true;

    try {
      const res  = await fetch('/api/workspace/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed })
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.data.isNew ? '🎉 New workspace created!' : '✅ Welcome back!', 'success');
        setTimeout(() => { window.location.href = '/workspace/' + data.data.workspaceId; }, 600);
      } else {
        throw new Error(data.message || 'Invalid workspace code');
      }
    } catch (err) {
      btn.innerHTML = orig;
      btn.disabled  = false;
      showToast(err.message || 'Failed to connect. Try again.', 'error');
    }
  };

  // Hero section entry
  const heroInput  = document.getElementById('workspace-code');
  const heroBtn    = document.getElementById('enter-workspace-btn');
  const heroError  = document.getElementById('workspace-error');

  heroBtn?.addEventListener('click', () => handleEntry(heroInput.value, heroBtn, heroError));
  heroInput?.addEventListener('keypress', e => { if (e.key === 'Enter') handleEntry(heroInput.value, heroBtn, heroError); });
  heroInput?.addEventListener('input', () => { if (heroError) heroError.classList.add('hidden'); });

  // Bottom CTA section entry
  const ctaInput = document.getElementById('workspace-code-bottom');
  const ctaBtn   = document.getElementById('enter-workspace-btn-bottom');
  ctaBtn?.addEventListener('click', () => handleEntry(ctaInput?.value, ctaBtn, null));
  ctaInput?.addEventListener('keypress', e => { if (e.key === 'Enter') handleEntry(ctaInput.value, ctaBtn, null); });

  // ── Smooth Scroll ────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // ── Navbar scroll shadow ─────────────────────────────────
  const navbar = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('shadow-md', window.scrollY > 10);
  });

  // ── Feature Cards Scroll Animation ──────────────────────
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity  = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feature-card').forEach((card, i) => {
    card.style.opacity   = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`;
    observer.observe(card);
  });

  // ── "How it works" steps animation ──────────────────────
  document.querySelectorAll('#how-it-works .text-center').forEach((step, i) => {
    step.style.opacity   = '0';
    step.style.transform = 'translateY(20px)';
    step.style.transition = `opacity 0.6s ease ${i * 0.15}s, transform 0.6s ease ${i * 0.15}s`;
    const stepObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity   = '1';
          entry.target.style.transform = 'translateY(0)';
          stepObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    stepObs.observe(step);
  });

  // ── Floating background shapes (randomize) ───────────────
  document.querySelectorAll('.floating-shape').forEach(shape => {
    const dur = 6 + Math.random() * 8;
    shape.style.animationDuration = dur + 's';
    shape.style.animationDelay    = (Math.random() * 3) + 's';
  });

  // ── Input focus glow effect ──────────────────────────────
  document.querySelectorAll('#workspace-code, #workspace-code-bottom').forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('ring-2', 'ring-primary/40');
    });
    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('ring-2', 'ring-primary/40');
    });
  });
});
