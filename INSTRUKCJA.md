# Safety App - Instrukcja Uzytkownika

## Wprowadzenie

Safety App to aplikacja PWA do dokumentowania spotkan bezpieczenstwa, incidentow, checklist, dzialan korygujacych i dzialan dyscyplinarnych w projektach budowlanych. System laczy dokumentacje operacyjna z historia zmian, eksportami PDF i CSV oraz narzedziami administracyjnymi.

Instrukcja obejmuje caly aktualny zakres funkcji dostepnych w aplikacji, lacznie z modulami admina i ograniczonym modulem audytowym.

## Instalacja i dostep

### Instalacja na telefonie
1. Otworz aplikacje w Safari lub Chrome.
2. Na iOS wybierz Udostepnij, a potem Dodaj do ekranu glownego.
3. Na Androidzie otworz menu przegladarki i wybierz Dodaj do ekranu glownego.

### Instalacja na komputerze
1. Otworz aplikacje w Chrome albo Edge.
2. Kliknij ikonke instalacji w pasku adresu.
3. Potwierdz instalacje.

### Logowanie
1. Zaloguj sie adresem email i haslem nadanym przez administratora.
2. W razie potrzeby uzyj przelacznika podgladu hasla przed zatwierdzeniem formularza.
3. Po zalogowaniu sprawdz, czy w menu po lewej widzisz moduly zgodne z Twoja rola.

## Role i dostepy

- Wszyscy uzytkownicy: Dashboard, Projects, Meetings & Safety Surveys, Safety Topics, People, Incidents, Corrective Actions, Disciplinary Actions, Checklists, User Manual.
- Admin: dodatkowo Admin Panel, Export Center, Bulk Import oraz rozszerzone uprawnienia edycyjne i eksportowe.
- Audit superadmin: dodatkowo System Records.

Nie nalezy uzywac cudzego konta ani omijac ograniczen dostepu. Rola uzytkownika jest czescia sladu audytowego.

## Dashboard i nawigacja

Po zalogowaniu aplikacja otwiera Dashboard. To punkt startowy do codziennej pracy.

### Co zobaczysz na Dashboardzie
- Liczniki spotkan, checklist i dzialan otwartych.
- Wskaznik dni bez incidentu.
- Przypomnienia o spotkaniach i aktywnosci.
- Ostatnia aktywnosc w systemie.
- Szybkie przejscia do glownych modulow.

### Jak korzystac
1. Sprawdz dashboard po zalogowaniu, zanim utworzysz nowy rekord.
2. Zweryfikuj, czy istnieje juz otwarty incident albo corrective action powiazane z aktualna sytuacja.
3. Przejdz do odpowiedniego modulu z menu bocznego.

## Projects

Modul Projects sluzy do porzadkowania danych wedlug realnych projektow i lokalizacji.

### Dostep
- Widoczny dla wszystkich uzytkownikow.

### Funkcje
- Tworzenie i edycja projektow.
- Pola: nazwa, klient, adres, opis, status, przypisane trades.
- Wyszukiwanie po nazwie, kliencie, adresie i trade.
- Sortowanie po dacie, nazwie i statusie.
- Widok szczegolow projektu z powiazanymi meetings i incidents.

### Typowy workflow
1. Utworz projekt przed rozpoczeciem dokumentowania meetings lub incidents.
2. Ustaw prawidlowy status projektu.
3. Otwieraj szczegoly projektu, aby przegladac cala aktywnosc dla jednego jobsite.

## Meetings & Safety Surveys

To glowny modul dokumentowania safety talks, attendance i materialu dowodowego.

### Dostep
- Wszyscy moga tworzyc i przegladac meetings.
- Admin moze edytowac spotkania, obslugiwac drafty, import CSV i approval flow.

### Najwazniejsze funkcje
- Tworzenie meetingu recznie.
- Projekt, data, czas i lokalizacja z GPS lub mapy.
- Wybor worker performing the meeting, trade i safety topic.
- Dodawanie attendees z katalogu osob albo recznie.
- Inline checklist completion w formularzu meetingu.
- Zdjecia, notatki, podpis leadera i potwierdzenia lub podpisy attendees.
- Self-training dla spotkan jednoosobowych.
- Szczegoly meetingu z pelnym podgladem danych.
- PDF pojedynczego meetingu, eksporty list, ZIP-y z PDF oraz chunked ZIP dla duzych zbiorow.
- Obszar draftow dla admina z filtrowaniem, paginacja i batch operations.

### Tworzenie meetingu recznie
1. Otworz Meetings & Safety Surveys i kliknij utworzenie nowego meetingu.
2. Wybierz projekt, date, godzine i lokalizacje.
3. Ustaw worker performing the meeting, trade i safety topic.
4. Dodaj attendees z People albo wpisz nazwy recznie.
5. Jesli trzeba, dolacz checklisty powiazane z trade lub topic.
6. Dodaj notatki i zdjecia.
7. Zlap podpis leadera z podpisu domyslnego albo narysuj nowy.
8. Dodaj potwierdzenia lub podpisy uczestnikow.
9. Zapisz rekord i w razie potrzeby wygeneruj PDF.

### Import BusyBusy CSV i draft approval
1. Admin otwiera Bulk Import.
2. Wybiera projekt i wgrywa plik CSV z BusyBusy.
3. System grupuje attendance do draft meetings.
4. Przed zapisem mozna wykryc duplikaty, pominac daty, poprawiac trade i topic.
5. Po zapisie drafty trafiaja do strefy draftow w Meetings.
6. Admin filtruje drafty, wykonuje bulk edit i uruchamia approval modal.
7. W approval flow potwierdza leadera, self-training, podpis i finalizuje rekordy.

### Przeglad i eksporty
- Filtry: topic, leader, attendee, project, trade, location, self-training, date range, time range.
- Szczegoly rekordu: podpisy, zdjecia, lokalizacja, checklisty, pelne dane spotkania.
- Eksport pojedynczy: PDF z jednego meetingu.
- Eksport zbiorczy: list PDF, chunked list ZIP, ZIP z osobnymi PDF.

## Safety Topics

Biblioteka tematow bezpieczenstwa wspierajaca toolbox talks i szkolenia.

### Dostep
- Wszyscy moga przegladac i wyszukiwac.
- Admin moze tworzyc, edytowac, usuwac i oznaczac featured topics.

### Funkcje
- Wyszukiwanie po nazwie, opisie i OSHA reference.
- Filtry po category, risk level i trade.
- Widok szczegolow z opisem, poziomem ryzyka, obrazem i OSHA reference.
- Suggested checklists dopasowane do topic i trade.
- PDF pojedynczego topicu i brochure PDF dla wszystkich widocznych topicow.

### Typowy workflow
1. Odfiltruj biblioteke po category, risk level lub trade.
2. Otworz szczegoly topicu i sprawdz, czy odpowiada realnemu zakresowi zagrozen.
3. W razie potrzeby skorzystaj z proponowanych checklist.
4. Wygeneruj pojedynczy PDF albo brochure PDF.

## Checklists

Modul do przygotowania i wykonywania list kontrolnych.

### Dostep
- Wszyscy moga wykonywac checklisty.
- Admin moze tworzyc szablony, edytowac historie i wykonywac eksporty szerszego zakresu.

### Funkcje
- Tworzenie szablonow z category i trades.
- Dodawanie itemow oraz section headers.
- Reordering itemow.
- Klonowanie istniejacych checklist.
- Wykonanie checklisty z notatkami do punktow, zdjeciami do punktow i zdjeciami globalnymi.
- Wybor projektu oraz completion datetime.
- Podpis osoby wykonujacej z podpisu domyslnego albo recznego.
- Historia wykonan, widok szczegolow i admin edit history.

### Tworzenie szablonu
1. Otworz Checklists i utworz nowy template albo otworz istniejacy.
2. Podaj nazwe, opis, category i trades.
3. Dodawaj itemy albo section headers.
4. Uloz kolejnosc krokow.
5. Zapisz template.

### Wykonanie checklisty
1. Wybierz checklist i uruchom completion.
2. Wybierz projekt, jesli checklist dotyczy konkretnego jobsite.
3. Ustaw completion date and time, jesli wartosc domyslna jest bledna.
4. Oznacz wykonane kroki i dopisz notatki tam, gdzie to potrzebne.
5. Dodaj zdjecia do pojedynczych krokow lub do calego completion.
6. Wybierz osobe podpisujaca i podpisz rekord.
7. Zapisz i w razie potrzeby sprawdz historie.

## Incidents

Modul do zglaszania incidents, near misses, unsafe conditions i safety violations.

### Dostep
- Wszyscy moga zglaszac incidents.
- Admin ma szersze uprawnienia do edycji, usuwania i eksportu.

### Funkcje
- Tryb Quick Report i Full Investigation.
- Typ incidentu, severity, project, location, map picker.
- Employee or person involved, reporter i witnesses.
- Safety violation type.
- Opis i szczegoly zdarzenia.
- Zdjecia i podpis reportera.
- Powiazania do corrective actions i disciplinary actions.
- PDF i eksporty zbiorcze.

### Zglaszanie incidentu
1. Otworz Incidents i wybierz nowy report.
2. Wybierz Quick Report albo Full Investigation.
3. Wpisz date, godzine, lokalizacje, projekt i typ zdarzenia.
4. Ustaw severity i szczegolowy opis.
5. Dodaj osobe zaangazowana, reportera i witnesses.
6. Zalacz zdjecia i potwierdz lokalizacje na mapie.
7. Dodaj podpis reportera.
8. Zapisz rekord.

### Follow-up po incidents
1. Otworz szczegoly incidentu.
2. Jesli trzeba, utworz corrective action bezposrednio z incidentu.
3. Dla safety violation uruchom disciplinary action z tego samego kontekstu.
4. Uzyj filtrow i PDF, gdy trzeba przygotowac material dla nadzoru lub dochodzenia.

## Corrective Actions

Modul zamykajacy petle follow-up po incidents i findings.

### Dostep
- Widoczny operacyjnie szerzej.
- Tworzenie, edycja i zamykanie to zwykle workflow admina lub upowaznionych osob.

### Funkcje
- Tworzenie action z incidentu albo bezposrednio w module.
- Responsible person oparty o People.
- Due date, status, declared completion date.
- Zdjecia, notatki i eksport PDF.
- Filtry po statusie, wyszukiwarka i widok overdue.

### Typowy workflow
1. Utworz action i opisz wymagane dzialanie korygujace.
2. Powiaz rekord z incidentem, jesli to follow-up po zdarzeniu.
3. Przypisz responsible person i due date.
4. W trakcie realizacji aktualizuj status i notatki.
5. Po faktycznym wykonaniu ustaw completion i, jesli trzeba, declared completion date.

Nie wolno oznaczac action jako completed, jesli prace nie zostaly naprawde wykonane albo zweryfikowane.

## Disciplinary Actions

Modul do dokumentowania formalnych reakcji na safety violations.

### Dostep
- Widoczny dla ciaglosci procesu.
- Tworzenie i utrzymanie rekordow nalezy do upowaznionych supervisorow lub adminow.

### Funkcje
- Powiazanie z incidentem.
- Action type, violation type, recipient, responsible leader.
- Data i czas reakcji.
- Notatki oraz eksport PDF.
- Filtry po action type, violation type i leader.

### Typowy workflow
1. Wejdz do modulu bezposrednio albo z poziomu safety violation incident.
2. Wybierz recipient, action type, violation type i responsible leader.
3. Wpisz date, czas i notatki opisujace formalna reakcje.
4. Zapisz rekord i przegladnij go w kontekscie incidentu oraz profilu osoby.

Rekordy dyscyplinarne musza opisywac realne dzialania nadzorcze i nie moga byc narzedziem odwetu.

## People

Katalog osob wykorzystywany w meetings, incidents i follow-up.

### Dostep
- Widoczny dla wszystkich jako punkt referencyjny.
- Dane podstawowe utrzymuje admin.

### Funkcje
- Wyszukiwanie osob po nazwie.
- Role badges: worker, performs the meetings albo obie role naraz.
- Widok profilu z zakladkami: meetings, projects, incidents, corrective actions, disciplinary actions.
- Informacje o firmie i powiazanym leaderze.

### Typowy workflow
1. Zanim przypiszesz attendance, witness albo responsible person, wyszukaj osobe w katalogu.
2. Zweryfikuj role badge i dane podstawowe.
3. Otworz profil, jesli potrzebujesz historii aktywnosci przed przypisaniem osoby do nowego rekordu.

## Export Center

Centralne miejsce eksportow PDF i CSV dla admina.

### Dostep
- Tylko admin.

### Funkcje
- Meetings list PDF.
- Chunked list ZIP dla duzych wynikow.
- ZIP z osobnymi PDF dla meetings.
- PDF dla incidents, corrective actions, safety topics i checklist history.
- CSV ZIP dla meetings, incidents, corrective actions, statistics i attendance.
- Progress modal oraz anulowanie wybranych eksportow ZIP.

### Typowy workflow PDF
1. Otworz Export Center.
2. Wybierz sekcje eksportu.
3. Ustaw filtry.
4. Dla meetings wybierz rodzaj eksportu: list PDF, chunked ZIP albo individual PDF ZIP.
5. Poczekaj na zakonczenie progress modala.

### Typowy workflow CSV
1. Otworz sekcje Spreadsheet Export.
2. Ustaw date range i projekt.
3. Zaznacz pliki CSV, ktore maja wejsc do ZIP.
4. Uruchom eksport i otworz ZIP w Excelu, Google Sheets albo innym narzedziu.

## Admin Panel

Panel administracyjny do utrzymania danych podstawowych i ustawien globalnych.

### Dostep
- Tylko admin.

### Zakladki
- Meetings.
- Incidents.
- Users.
- Workers Performing the Meetings.
- Workers & Subs.
- Companies.
- Topic Checklists.
- Settings.
- Analytics.

### Funkcje
- Tworzenie i edycja users.
- Utrzymanie leaders i involved persons.
- Podpisy domyslne dla users, leaders i workers.
- Utrzymanie companies.
- Ustawienia featured categories, featured topics i featured trades.
- Global timezone dla calej aplikacji.
- Topic-checklist mapping.
- Narzedzia naprawcze dla draft meetings.
- Analytics dashboard.

### Wazna uwaga o timezone
Global timezone ustawiany przez admina wplywa na interpretacje dat i godzin w aplikacji, formularzach i eksportach. To ustawienie nalezy zmieniac rzadko i swiadomie.

## Bulk Import

Bulk Import to admin-only workflow przygotowania draft meetings z plikow BusyBusy CSV.

### Dostep
- Tylko admin.

### Funkcje
- Parsowanie CSV z BusyBusy.
- Grupowanie danych do draft meetings.
- Wykrywanie duplikatow dat.
- Korekta trade i topic przed zapisem.
- Tworzenie brakujacych osob.
- Przekazanie rekordow do dalszego approval flow w Meetings.

### Workflow
1. Wybierz projekt.
2. Wgraj CSV.
3. Zweryfikuj draft groups.
4. Popraw trade lub topic albo pomin duplikaty.
5. Zapisz drafty.
6. Finalizuj je potem w Meetings przez approval flow.

## System Records

Modul audytowy do pracy ograniczonej do audit superadmin.

### Dostep
- Tylko restricted audit superadmin.

### Funkcje
- Filtry i wyszukiwanie audit events.
- Record-history snapshots i porownanie stanu przed i po zmianie.
- Eksport PDF z materialem dowodowym.

### Workflow
1. Otworz modul tylko wtedy, gdy przeglad jest autoryzowany.
2. Zawez wyniki filtrami i wyszukiwaniem.
3. Otworz konkretny audit event albo history snapshot.
4. W razie potrzeby wygeneruj ograniczony evidence PDF.

To nie jest standardowy modul operacyjny dla zwyklych uzytkownikow ani zwyklych adminow.

## User Manual

W aplikacji dostepny jest osobny, sekcyjny manual pod modulem User Manual.

### Co zawiera
- Opis celu kazdego modulu.
- Zakres dostepu.
- Kluczowe mozliwosci.
- Procedury krok po kroku.
- Eksport handbook PDF.

## Wskazowki praktyczne

### Lokalizacja
- Pozwol aplikacji na dostep do lokalizacji, jesli chcesz korzystac z GPS i map pickera.
- Gdy lokalizacja automatyczna jest niedokladna, popraw adres recznie.

### Podpisy
- System obsluguje podpisy domyslne oraz reczne podpisy rysowane w aplikacji.
- Nie wolno podpisywac rekordow za inna osobe.

### Zdjecia
- Zdjecia mozna dodawac do meetings, incidents, corrective actions i checklist completions.
- Do checklist mozna dolaczac zdjecia globalne oraz zdjecia do pojedynczych krokow.

### Eksporty
- Dla malych zbiorow uzywaj zwyklych PDF.
- Dla duzych list meetings uzywaj chunked ZIP.
- Dla analiz w arkuszu kalkulacyjnym uzywaj eksportow CSV.

## Rozwiazywanie problemow

### Nie moge sie zalogowac
- Sprawdz email i haslo.
- Skontaktuj sie z administratorem.

### Nie widze modulu, ktorego potrzebuje
- Najpierw sprawdz, czy Twoje konto ma odpowiednia role.
- Nie uzywaj cudzego konta.
- Zglos brak dostepu administratorowi.

### GPS lub mapa dziala zle
- Sprawdz uprawnienia przegladarki.
- Popraw lokalizacje recznie.

### Eksport trwa dlugo
- Przy duzych zbiorach nie zamykaj karty podczas pracy progress modala.
- Dla meetings wybierz chunked ZIP zamiast jednego duzego PDF.

### Zdjecia lub podpis nie zapisuja sie poprawnie
- Sprawdz polaczenie internetowe.
- Sprobuj ponownie zaladowac formularz.
- Jesli problem dotyczy podpisu domyslnego, zweryfikuj rekord osoby w Admin Panel.

## Odpowiedzialnosc i dobra wiara

- Wszystkie rekordy wprowadzane do aplikacji sa odpowiedzialnoscia osoby, ktora je zapisuje.
- Nie wolno wprowadzac danych falszywych, mylacych, niepelnych, odwetowych ani w zlej wierze.
- System wspiera dokumentacje i sledzenie historii, ale nie zastepuje polityki firmy, obowiazkow prawnych, nadzoru ani profesjonalnej oceny sytuacji.

---

**Wersja:** 1.1.0  
**Data:** 2026-03-16
