# 📁 Struktura Projektu - Safety Meetings App

## Pliki Główne

```
safety/
├── index.html                 # Główny plik HTML
├── package.json              # Zależności i skrypty
├── package-lock.json         # Lock file dla npm
├── vite.config.js            # Konfiguracja Vite + PWA
├── .gitignore               # Ignorowane pliki dla Git
│
├── README.md                 # Dokumentacja techniczna (EN)
├── INSTRUKCJA.md            # Instrukcja użytkownika (PL)
├── PODSUMOWANIE.md          # Podsumowanie projektu (PL)
└── QUICK-START.md           # Szybki start (PL)
```

## Folder Public (Pliki Statyczne)

```
public/
├── favicon.svg              # Ikona SVG
├── manifest.json            # PWA Manifest
└── ICONS-README.md          # Instrukcja tworzenia ikon
```

**Brakujące (do dodania):**
- `pwa-192x192.png` - Ikona PWA 192x192
- `pwa-512x512.png` - Ikona PWA 512x512
- `apple-touch-icon.png` - Ikona Apple 180x180

## Folder Src (Kod Źródłowy)

### Root Src
```
src/
├── main.jsx                 # Entry point React
├── App.jsx                  # Główny komponent + routing
└── index.css               # Globalne style
```

### Komponenty
```
src/components/
├── Layout.jsx              # Layout z header i navigation
└── Layout.css             # Style dla Layout
```

### Biblioteki
```
src/lib/
├── supabase.js            # Konfiguracja Supabase client
└── pdfGenerator.js        # Funkcje generowania PDF
```

### Strony
```
src/pages/
├── Login.jsx              # Strona logowania
├── Login.css             # Style logowania
│
├── MainMenu.jsx          # Menu główne
├── MainMenu.css         # Style menu
│
├── Projects.jsx         # Lista projektów
├── Projects.css        # Style projektów
│
├── Meetings.jsx        # Lista meetings
├── MeetingForm.jsx    # Formularz meeting
├── MeetingForm.css   # Style formularza meeting
│
├── Incidents.jsx       # Lista incydentów
├── IncidentForm.jsx   # Formularz incydentu
├── IncidentForm.css  # Style formularza incydentu
│
├── Checklists.jsx          # Lista checklistów
├── ChecklistForm.jsx      # Formularz checklisty
├── ChecklistForm.css     # Style formularza
├── ChecklistCompletion.jsx    # Wypełnianie checklisty
├── ChecklistCompletion.css   # Style wypełniania
│
├── AdminPanel.jsx     # Panel administracyjny
└── AdminPanel.css    # Style admin panelu
```

## Szczegóły Komponentów

### 📄 Login.jsx
- Formularz logowania
- Integracja z Supabase Auth
- Error handling

### 🏠 MainMenu.jsx
- 5 kafelków menu (Projects, Meetings, Incidents, Checklists, Admin)
- Nawigacja do głównych sekcji
- Ikony emoji

### 📁 Projects.jsx
- Lista wszystkich projektów
- Formularz dodawania nowego projektu
- Statusy projektów (active/completed/archived)

### 📋 Meetings.jsx + MeetingForm.jsx
**Lista (Meetings.jsx):**
- Wyświetlanie historii meetings
- Przycisk generowania PDF
- Sortowanie po dacie

**Formularz (MeetingForm.jsx):**
- Auto-uzupełnianie daty/czasu
- GPS location (auto + manual)
- Zarządzanie liderami
- Dodawanie uczestników
- Upload wielu zdjęć
- Canvas do podpisu
- Walidacja formularza

### ⚠️ Incidents.jsx + IncidentForm.jsx
**Lista (Incidents.jsx):**
- Wyświetlanie incydentów
- Filtry i sortowanie
- Generowanie PDF

**Formularz (IncidentForm.jsx):**
- Podobny do Meetings
- Dodatkowe pola: employee, reporter, type
- Upload jednego zdjęcia
- Canvas do podpisu

### ✅ Checklists.jsx + ChecklistForm.jsx + ChecklistCompletion.jsx
**Lista (Checklists.jsx):**
- Wyświetlanie checklistów
- Statystyki (items, completions)
- Przyciski: Complete i View/Edit

**Formularz (ChecklistForm.jsx):**
- Tworzenie/edycja checklisty
- Dodawanie punktów
- Zmiana kolejności (↑↓)
- Historia wypełnień

**Wypełnianie (ChecklistCompletion.jsx):**
- Checkboxy dla każdego punktu
- Progress bar
- Notatki do punktów
- Powiązanie z projektem

### ⚙️ AdminPanel.jsx
- 3 zakładki: Meetings, Incidents, Users
- Tabele z danymi
- Usuwanie rekordów
- Informacja o zarządzaniu użytkownikami

## Funkcje Pomocnicze

### 📚 src/lib/supabase.js
```javascript
export const supabase = createClient(url, key)
```
- Konfiguracja Supabase
- Export klienta do użycia w całej aplikacji

### 📄 src/lib/pdfGenerator.js
```javascript
export const generateMeetingPDF(meeting)
export const generateIncidentPDF(incident)
```
- Generowanie PDF dla meetings
- Generowanie PDF dla incidents
- Formatowanie danych
- Dodawanie zdjęć i podpisów
- Helper: loadImage()

## Style

### 🎨 Globalne (index.css)
- CSS Reset
- Design system (zmienne)
- Globalne klasy (.btn, .form-input, .card, etc.)
- Responsive breakpoints

### 🎨 Lokalne
Każdy komponent ma swój plik CSS z:
- Specyficznymi stylami dla komponentu
- Layout grid/flex
- Responsive media queries
- Hover states

## Design Tokens

```css
:root {
  --color-primary: #171717;    /* Czarny */
  --color-accent: #EE2E2F;     /* Czerwony */
  --color-bg: #ffffff;         /* Biały */
  --color-text: #171717;       /* Czarny */
  --color-border: #e5e5e5;     /* Szary */
  --color-hover: #f5f5f5;      /* Jasny szary */
}
```

## Routing

```javascript
/ → MainMenu
/projects → Projects
/meetings → Meetings
/meetings/new → MeetingForm (create)
/meetings/:id → MeetingForm (edit)
/incidents → Incidents
/incidents/new → IncidentForm (create)
/incidents/:id → IncidentForm (edit)
/checklists → Checklists
/checklists/new → ChecklistForm (create)
/checklists/:id → ChecklistForm (edit)
/checklists/:id/complete → ChecklistCompletion
/admin → AdminPanel
```

## Zależności (package.json)

### Production:
- `@supabase/supabase-js` - Supabase client
- `react` + `react-dom` - React framework
- `react-router-dom` - Routing
- `react-signature-canvas` - Podpisy
- `jspdf` - Generowanie PDF

### Development:
- `vite` - Build tool
- `@vitejs/plugin-react` - React plugin
- `vite-plugin-pwa` - PWA support

## Baza Danych (Supabase)

### Tabele:
1. `projects` (istniejąca)
2. `meetings` (nowa)
3. `meeting_attendees` (nowa)
4. `meeting_photos` (nowa)
5. `incidents` (nowa)
6. `incident_types` (nowa)
7. `checklists` (nowa)
8. `checklist_items` (nowa)
9. `checklist_completions` (nowa)
10. `checklist_completion_items` (nowa)
11. `leaders` (nowa)

### Storage:
- Bucket: `safety-photos`
- Publiczny dostęp
- Przechowuje: zdjęcia, podpisy

## Łączna Liczba Plików

- **Źródłowe (src/)**: 26 plików
- **Publiczne (public/)**: 3 pliki
- **Główne**: 8 plików
- **Node modules**: ~460 packages

**Razem (bez node_modules): 37 plików**

## Metryki Kodu

- **React Components**: 14
- **CSS Files**: 13
- **JavaScript Utilities**: 2
- **Total Lines**: ~3500+ linii kodu

---

**Status**: ✅ Kompletny i gotowy do użycia
