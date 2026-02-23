# Safety Meetings App - Instrukcja Użytkownika

## Wprowadzenie

Aplikacja Safety Meetings to nowoczesna, responsywna aplikacja PWA (Progressive Web App) stworzona do zarządzania safety meetings, incydentami i checklistami w branży budowlanej.

## Instalacja

### Na telefonie (iOS/Android):
1. Otwórz przeglądarkę (Safari na iOS, Chrome na Android)
2. Przejdź do aplikacji przez link
3. Na iOS: Kliknij przycisk "Udostępnij" → "Dodaj do ekranu głównego"
4. Na Android: Kliknij "..." → "Dodaj do ekranu głównego"

### Na komputerze:
1. Otwórz Chrome lub Edge
2. Przejdź do aplikacji
3. Kliknij ikonę instalacji w pasku adresu
4. Potwierdź instalację

## Pierwsze Kroki

### 1. Logowanie
- Zaloguj się używając swojego konta Supabase
- Email i hasło są zarządzane przez administratora

### 2. Menu Główne
Po zalogowaniu zobaczysz 5 głównych sekcji:
- **Projects** - Zarządzanie projektami
- **Meetings** - Safety meetings
- **Incidents** - Zgłoszenia incydentów
- **Checklists** - Listy kontrolne
- **Admin Panel** - Panel administracyjny (tylko dla adminów)

## Funkcje

### Projects (Projekty)

**Tworzenie nowego projektu:**
1. Kliknij "+ New Project"
2. Wypełnij formularz:
   - Nazwa projektu (wymagane)
   - Nazwa klienta
   - Adres projektu
   - Opis
   - Status (Active/Completed/Archived)
3. Zapisz

### Meetings (Safety Meetings)

**Tworzenie nowego meetingu:**
1. Kliknij "+ New Meeting"
2. Wypełnij formularz:
   - **Data** - automatycznie wypełniona (można zmienić)
   - **Czas** - automatycznie wypełniony (można zmienić)
   - **Lokalizacja** - automatycznie z GPS (można wpisać ręcznie)
   - **Project** - wybierz z listy (opcjonalne)
   - **Leader** - wybierz z listy lub dodaj nowego
   - **Topic** - temat spotkania (wymagane)
   - **Notes** - notatki

3. Dodaj uczestników:
   - Wpisz imię i nazwisko
   - Kliknij "+ Add"
   - Dodaj kolejnych uczestników

4. Dodaj zdjęcia:
   - Kliknij "Upload Photos"
   - Wybierz jedno lub więcej zdjęć
   - Możesz dodać wiele zdjęć

5. Podpis (opcjonalny):
   - Podpisz palcem/myszką w polu
   - Kliknij "Clear Signature" aby wyczyścić

6. Kliknij "Create Meeting"

**Generowanie PDF:**
- Na liście meetings, kliknij przycisk "📄 PDF"
- PDF zostanie automatycznie pobrany

### Incidents (Incydenty)

**Zgłaszanie incydentu:**
1. Kliknij "+ Report Incident"
2. Wypełnij informacje:
   - Data i czas
   - Lokalizacja (auto-GPS)
   - Typ incydentu (wybierz lub dodaj nowy)
   - Project (opcjonalnie)

3. Dane pracownika:
   - Imię i nazwisko pracownika
   - Numer telefonu
   - Imię i nazwisko zgłaszającego

4. Szczegóły:
   - Opis incydentu (wymagane)
   - Dodatkowe notatki

5. Załącz zdjęcie (opcjonalnie)

6. Podpis (opcjonalnie)

7. Kliknij "Report Incident"

**Generowanie PDF:**
- Podobnie jak w meetings, kliknij "📄 PDF"

### Checklists (Listy Kontrolne)

**Tworzenie checklisty:**
1. Kliknij "+ New Checklist"
2. Podaj nazwę i opis
3. Dodaj punkty checklisty:
   - Wpisz treść punktu
   - Kliknij "+ Add Item"
   - Użyj strzałek ↑↓ aby zmienić kolejność
4. Zapisz

**Wypełnianie checklisty:**
1. Wybierz checklistę z listy
2. Kliknij "Complete Checklist"
3. Zaznacz wykonane punkty
4. Dodaj notatki do poszczególnych punktów (opcjonalnie)
5. Wybierz projekt (opcjonalnie)
6. Dodaj ogólne notatki (opcjonalnie)
7. Kliknij "Complete Checklist"

**Historia wypełnień:**
- Otwórz checklistę w trybie edycji
- Kliknij "Show" przy "Completion History"
- Zobacz wszystkie poprzednie wypełnienia

### Admin Panel

**Dostępne funkcje:**
- Przeglądanie wszystkich meetings
- Przeglądanie wszystkich incydentów
- Usuwanie rekordów
- Informacja o użytkownikach

**Usuwanie rekordów:**
1. Wybierz zakładkę (Meetings/Incidents)
2. Znajdź rekord do usunięcia
3. Kliknij 🗑️
4. Potwierdź usunięcie

## Funkcje PWA

### Praca offline:
- Po pierwszym otwarciu, aplikacja działa bez internetu
- Dane są synchronizowane gdy pojawi się połączenie

### Powiadomienia:
- Aplikacja może wysyłać powiadomienia (jeśli włączone)

### Aktualizacje:
- Aplikacja automatycznie aktualizuje się w tle

## Wskazówki

1. **Lokalizacja GPS**:
   - Przy pierwszym użyciu, pozwól na dostęp do lokalizacji
   - Jeśli GPS nie działa, wpisz lokalizację ręcznie

2. **Zdjęcia**:
   - Możesz robić zdjęcia bezpośrednio z aplikacji
   - Lub wybierać z galerii
   - Zdjęcia są automatycznie kompresowane

3. **Podpisy**:
   - Na telefonie rysuj palcem
   - Na komputerze użyj myszki lub touchpada
   - Możesz wielokrotnie czyścić i rysować na nowo

4. **PDF**:
   - PDF zawiera wszystkie dane z formularza
   - Załączone są zdjęcia i podpisy
   - PDF jest automatycznie pobierany

5. **Projekty**:
   - Utwórz projekty przed tworzeniem meetings
   - Projekty pomagają organizować dane

## Rozwiązywanie Problemów

### Nie mogę się zalogować:
- Sprawdź email i hasło
- Skontaktuj się z administratorem

### GPS nie działa:
- Sprawdź uprawnienia w ustawieniach telefonu
- Wpisz lokalizację ręcznie

### Zdjęcia się nie wgrywają:
- Sprawdź połączenie z internetem
- Sprawdź uprawnienia do aparatu/galerii

### Aplikacja nie działa:
- Odśwież stronę
- Wyloguj się i zaloguj ponownie
- Wyczyść cache przeglądarki

## Bezpieczeństwo

- Wszystkie dane są szyfrowane
- Hasła są bezpiecznie przechowywane
- Zdjęcia są przechowywane w bezpiecznej chmurze
- Tylko zalogowani użytkownicy mają dostęp

## Kontakt

W przypadku problemów lub pytań, skontaktuj się z administratorem systemu.

---

**Wersja:** 1.0.0  
**Data:** 2026-02-23
