# Safety Topics Feature

## Przegląd

Dodana funkcjonalność zarządzania tematami (topics) dla safety meetings.

## Funkcjonalności

### 1. Tabela Safety Topics w Bazie Danych

Utworzona tabela `safety_topics` zawierająca:
- `id` - UUID (klucz główny)
- `name` - nazwa tematu (wymagane)
- `category` - kategoria (opcjonalne)
- `osha_reference` - odniesienie do standardu OSHA, np. 1926.503 (opcjonalne)
- `description` - opis tematu (opcjonalne)
- `risk_level` - poziom ryzyka: low, medium, high, critical (wymagane, domyślnie: medium)
- `created_at` - data utworzenia
- `created_by` - użytkownik tworzący
- `updated_at` - data ostatniej aktualizacji

### 2. Bezpieczeństwo (RLS Policies)

- **Odczyt**: Wszyscy użytkownicy (także niezalogowani)
- **Dodawanie**: Zalogowani użytkownicy
- **Edycja**: Tylko administratorzy
- **Usuwanie**: Tylko administratorzy

### 3. Strona Zarządzania Topikami (`/safety-topics`)

Funkcje:
- Lista wszystkich topiców z filtrami
- Wyszukiwanie po nazwie, opisie i OSHA reference
- Filtrowanie po kategorii
- Filtrowanie po poziomie ryzyka
- Dodawanie nowych topiców (wszyscy zalogowani użytkownicy)
- Usuwanie topiców (tylko administratorzy)

Wyświetlane informacje:
- Nazwa topicu
- Kategoria
- OSHA reference (jeśli jest)
- Poziom ryzyka (kolorowa etykieta)
- Opis

### 4. Integracja z Formularzem Meeting

W formularzu spotkania (`/meetings/new`, `/meetings/:id/edit`):
- Rozwijana lista topiców pogrupowanych po kategoriach
- Wyświetlanie OSHA reference i poziomu ryzyka dla każdego topicu
- Opcja "Custom Topic" dla wprowadzenia własnego tematu
- Możliwość przełączania między listą a custom topic

## Predefiniowane Topiki

System zawiera 20 predefiniowanych topiców bezpieczeństwa w następujących kategoriach:

- **Personal Protective Equipment** - Fall Protection, PPE
- **Work Platforms** - Scaffolding Safety
- **Access Equipment** - Ladder Safety
- **Electrical Hazards** - Electrical Safety
- **Energy Control** - Lockout/Tagout
- **Earthwork** - Excavation and Trenching
- **Atmospheric Hazards** - Confined Space Entry
- **Chemical Safety** - Hazard Communication
- **Fire Safety** - Fire Prevention
- **Heavy Equipment** - Crane and Rigging Safety
- **Powered Industrial Vehicles** - Forklift Safety
- **Respiratory Hazards** - Respiratory Protection
- **Environmental Hazards** - Heat/Cold Stress Prevention
- **Tools and Equipment** - Hand and Power Tools
- **Access and Egress** - Stairways
- **Noise Hazards** - Hearing Conservation
- **Biological Hazards** - Bloodborne Pathogens
- **Emergency Preparedness** - Emergency Action Plan

## Pliki Zmodyfikowane

- `/supabase/migrations/create_safety_topics_table.sql` - migracja bazy danych
- `/src/pages/SafetyTopics.jsx` - komponent strony zarządzania
- `/src/pages/SafetyTopics.css` - style dla strony zarządzania
- `/src/pages/MeetingForm.jsx` - zaktualizowany formularz spotkań
- `/src/pages/MainMenu.jsx` - dodany link do Safety Topics
- `/src/App.jsx` - dodany routing

## Użycie

### Dla użytkowników:
1. Kliknij "Safety Topics" w menu głównym
2. Przeglądaj topici, używając filtrów jeśli potrzeba
3. Dodaj nowy topic klikając "+ Add Topic"
4. Przy tworzeniu meeting, wybierz topic z listy lub użyj custom topic

### Dla administratorów:
- Dodatkowa możliwość usuwania topiców (przycisk ×)
- Topici mogą być edytowane przez admina (obecnie tylko przez DELETE i INSERT)

## Uwagi techniczne

- Migracja automatycznie tworzy indeksy na `category` i `risk_level` dla wydajności
- Trigger automatycznie aktualizuje `updated_at` przy każdej zmianie
- Poziomy ryzyka są kolorowo kodowane dla łatwej identyfikacji
