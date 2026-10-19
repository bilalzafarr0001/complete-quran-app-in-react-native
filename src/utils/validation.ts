const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) {
    return 'Enter your email';
  }
  if (!EMAIL_RE.test(value.trim())) {
    return 'Enter a valid email address';
  }
}

export function validatePassword(value: string): string | undefined {
  if (!value) {
    return 'Enter a password';
  }
  if (value.length < 8) {
    return 'Use at least 8 characters';
  }
}

/** Returns a score from 0 (empty) to 4 (strong). */
export function passwordStrength(value: string): number {
  if (!value) {
    return 0;
  }
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return Math.max(score, 1);
}
