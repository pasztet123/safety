# 🚀 Quick Start Guide - Safety Meetings App

## Szybki Start

### 1. Sprawdź co masz
```bash
cd /Users/stas/roofchimp-plugin/safety
ls -la
```

Powinieneś zobaczyć:
- `src/` - kod źródłowy
- `public/` - pliki publiczne
- `package.json` - zależności
- `vite.config.js` - konfiguracja

### 2. Zainstaluj zależności (jeśli jeszcze nie)
```bash
npm install
```

### 3. Uruchom aplikację
```bash
npm run dev
```

Otwórz: http://localhost:5173/

### 4. Testowanie

#### Logowanie:
- Musisz utworzyć użytkownika w Supabase Dashboard
- Przejdź do: https://supabase.com/dashboard/project/lnfzvpaonuzbcnlulyyk/auth/users
- Kliknij "Add user"
- Podaj email i hasło
- Zaloguj się w aplikacji

#### Testowanie funkcji:
1. **Projects**: Utwórz kilka projektów
2. **Meetings**: Dodaj meeting, dodaj uczestników, wgraj zdjęcia
3. **Incidents**: Zgłoś incydent, dodaj zdjęcie
4. **Checklists**: Utwórz checklistę, wypełnij ją
5. **PDF**: Wygeneruj PDF dla meetingu i incydentu

### 5. Ikony PWA (opcjonalne)

Stwórz lub wygeneruj ikony i umieść w `public/`:
- `pwa-192x192.png`
- `pwa-512x512.png`
- `apple-touch-icon.png`

Możesz użyć: https://realfavicongenerator.net/

### 6. Deployment na Vercel (zalecane)

```bash
# Zainstaluj Vercel CLI (jeśli nie masz)
npm i -g vercel

# Deploy
vercel

# Następnie wybierz opcje:
# - Set up and deploy? Yes
# - Project name? safety-meetings
# - Directory? ./
# - Build command? npm run build
# - Output directory? dist
```

Lub przez GitHub:
1. Push kod do GitHub
2. Połącz repo z Vercel
3. Deploy automatycznie

### 7. Deployment na Netlify

```bash
# Build
npm run build

# Drag & drop folder 'dist' do Netlify
```

Lub przez CLI:
```bash
npm i -g netlify-cli
netlify deploy --prod
```

### 8. Environment Variables (jeśli zmieniasz Supabase)

Stwórz `.env`:
```env
VITE_SUPABASE_URL=https://lnfzvpaonuzbcnlulyyk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Zaktualizuj `src/lib/supabase.js`:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

## Checklist Przed Production

- [ ] Dodaj użytkowników w Supabase Auth
- [ ] Przetestuj wszystkie funkcje
- [ ] Wygeneruj ikony PWA
- [ ] Zaktualizuj manifest.json (nazwa, opis)
- [ ] Build production (`npm run build`)
- [ ] Przetestuj build (`npm run preview`)
- [ ] Deploy na hosting
- [ ] Przetestuj na telefonie
- [ ] Zainstaluj jako PWA
- [ ] Sprawdź offline mode

## Komendy NPM

```bash
# Development
npm run dev          # Uruchom dev server

# Production
npm run build        # Build dla produkcji
npm run preview      # Preview buildu

# Inne
npm install          # Zainstaluj zależności
npm audit fix        # Napraw vulnerabilities
```

## Troubleshooting

### "npm install" nie działa:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 5173 zajęty:
```bash
npm run dev -- --port 3000
```

### Build fails:
```bash
npm run build -- --debug
```

### Supabase connection error:
- Sprawdź URL i API key
- Sprawdź internet connection
- Sprawdź Supabase status

## URLs

- **App (local)**: http://localhost:5173/
- **Supabase Dashboard**: https://supabase.com/dashboard/project/lnfzvpaonuzbcnlulyyk
- **Storage**: https://supabase.com/dashboard/project/lnfzvpaonuzbcnlulyyk/storage/buckets/safety-photos

## Support Files

- `README.md` - Technical documentation (EN)
- `INSTRUKCJA.md` - User manual (PL)
- `PODSUMOWANIE.md` - Project summary (PL)

## Kontakt

Jeśli coś nie działa, sprawdź:
1. Console w przeglądarce (F12)
2. Terminal output
3. Supabase logs
4. Network tab w DevTools

---

**Wszystko działa? Świetnie! 🎉**

Twoja aplikacja jest gotowa do użycia!
