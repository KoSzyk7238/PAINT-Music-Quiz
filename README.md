# PAINT-Music-Quiz

Aplikacja to nowoczesny quiz muzyczny, w którym gracze zgadują tytuły piosenek lub wykonawców na podstawie krótkich (np. 15-sekundowych) fragmentów audio. Projekt składa się z backendu w języku Python (Django REST Framework), nowoczesnego frontendu napisanego w React (zbudowanego przy użyciu Vite i stylizowanego za pomocą Vanilla CSS) oraz bazy danych MariaDB. Całość jest w pełni skonteneryzowana za pomocą Docker Compose.

Poniższa instrukcja krok po kroku opisuje domyślną zawartość aplikacji oraz wyjaśnia, **jak zainstalować od zera WSL2 oraz Docker Desktop w systemie Windows**, a następnie uruchomić aplikację za pomocą jednego polecenia.

---

## Spis Treści
1. [Domyślne Dane i Zawartość](#1-domyślne-dane-i-zawartość)
2. [Instalacja WSL 2 i Docker Desktop na Windows (Od Podstaw)](#2-instalacja-wsl-2-i-docker-desktop-na-windows-od-podstaw)
3. [Uruchamianie Projektu Krok po Kroku](#3-uruchamianie-projektu-krok-po-kroku)
4. [Wyłączanie i Resetowanie Aplikacji](#4-wyłączanie-i-resetowanie-aplikacji)
5. [Tabela Portów i Adresów](#5-tabela-portów-i-adresów)

---

## 1. Domyślne Dane i Zawartość

Podczas pierwszego uruchomienia migracje oraz skrypt seedujący automatycznie konfigurują bazę danych:

*   **Domyślne konto administratora (Django Admin)**:
    *   **Login**: `admin`
    *   **Hasło**: `admin`
*   **Domyślnie zaimportowane quizy**:
    W bazie danych automatycznie znajdziesz 3 gotowe, pełne quizy utworzone na podstawie oficjalnych playlist Apple Music (pobierane są próbki utworów 30s bezpośrednio z iTunes API):
    1.  **Quebonafide — niezbędnik** (33 piosenki)
    2.  **Taco Hemingway — niezbędnik** (23 piosenki)
    3.  **Rap Life** (101 piosenek)

Domyślny limit czasu odtwarzania w quizach wynosi **15 sekund** (z 2-sekundowym żółtym "bezpiecznym obszarem" na początku, podczas którego gracz nie traci punktów). W ustawieniach każdego quizu w panelu admina czas ten można zmienić w przedziale od 0 do 30 sekund.

---

## 2. Instalacja WSL 2 i Docker Desktop na Windows (Od Podstaw)

Zanim uruchomisz aplikację, musisz przygotować środowisko, instalując **WSL 2** (Windows Subsystem for Linux) oraz **Docker Desktop**. Jest to wymagane, ponieważ aplikacja działa w kontenerach.

### Krok 1: Instalacja WSL 2 (Windows Subsystem for Linux)
1. Otwórz menu Start, wyszukaj **PowerShell**, kliknij na niego prawym przyciskiem myszy i wybierz **Uruchom jako administrator**.
2. Wpisz poniższe polecenie i naciśnij Enter:
   ```powershell
   wsl --install
   ```
3. Poczekaj na zakończenie procesu. To polecenie automatycznie włączy wymagane funkcje systemu Windows, zainstaluje architekturę WSL 2 oraz pobierze domyślną dystrybucję Linuksa (Ubuntu).
4. **Uruchom ponownie komputer**. Po restarcie może otworzyć się okno terminala w celu dokończenia konfiguracji Ubuntu (poprosi o podanie nowej nazwy użytkownika i hasła – możesz podać dowolne, zapamiętaj je).

### Krok 2: Instalacja Docker Desktop
1. Wejdź na oficjalną stronę Dockera: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) i pobierz wersję dla systemu **Windows**.
2. Uruchom pobrany instalator (`Docker Desktop Installer.exe`).
3. Podczas instalacji upewnij się, że opcja **Use WSL 2 instead of Hyper-V** (Użyj WSL 2 zamiast Hyper-V) jest **zaznaczona**.
4. Po zakończeniu instalacji kliknij **Close and restart** (Zamknij i uruchom ponownie komputer).
5. Po restarcie komputera uruchom aplikację **Docker Desktop** (najlepiej z menu Start) i zaakceptuj warunki licencji. Możesz pominąć logowanie, wybierając opcję "Continue without signing in".
6. Upewnij się, że ikona wieloryba w lewym dolnym rogu programu Docker Desktop świeci się na zielono (oznacza to, że silnik Dockera działa poprawnie).

---

## 3. Uruchamianie Projektu Krok po Kroku

Gdy masz już zainstalowanego i uruchomionego Dockera:

### Krok 1: Przygotowanie pliku `.env`
Projekt wymaga pliku `.env` w katalogu głównym projektu do poprawnej konfiguracji bazy danych w kontenerach.
1. W głównym folderze projektu (tam gdzie znajduje się plik `docker-compose.yml`) utwórz nowy plik tekstowy o nazwie `.env` (upewnij się, że nie ma rozszerzenia `.txt` na końcu).
2. Otwórz plik w Notatniku lub innym edytorze kodu i wklej do niego poniższą konfigurację:
   ```env
   DB_NAME=paint_music_quiz
   DB_USER=pmq_user
   DB_PASSWORD=pmq_password
   DB_HOST=db
   DB_PORT=3306

   MARIADB_ROOT_PASSWORD=devroot
   MARIADB_DATABASE=paint_music_quiz
   MARIADB_USER=pmq_user
   MARIADB_PASSWORD=pmq_password
   ```
3. Zapisz plik.

### Krok 2: Uruchomienie kontenerów
1. Otwórz wiersz poleceń Windows (`cmd` lub `PowerShell`) i przejdź do głównego folderu projektu, np.:
   ```cmd
   cd C:\Sciezka\Do\Projektu\PAINT-Music-Quiz
   ```
2. Uruchom aplikację za pomocą Docker Compose:
   *   **Standardowe uruchomienie (w okienku terminala)**:
       ```cmd
       docker-compose up --build
       ```
       *Uwaga: Flaga `--build` jest potrzebna tylko przy pierwszym uruchomieniu lub po zmianie kodu. Przy kolejnych uruchomieniach wystarczy wpisać `docker-compose up`.*
       
       **Ważne:** Po uruchomieniu tej komendy terminal musi pozostać otwarty! Zamknięcie terminala lub przerwanie procesu spowoduje wyłączenie serwerów (kontenery zakończą działanie z kodem 143/137).
   *   **Uruchomienie w tle (tzw. tryb detached)**:
       Jeśli chcesz, aby serwery działały w tle i nie blokowały okna konsoli, wpisz:
       ```cmd
       docker-compose up -d
       ```
3. Docker automatycznie pobierze obrazy, zainstaluje wszystkie zależności, uruchomi bazę MariaDB, wykona migracje oraz pobierze na żywo utwory z Apple Music.
4. Gdy w logach pojawi się informacja o poprawnym wystartowaniu serwerów (np. `VITE ready`), otwórz przeglądarkę i przejdź na stronę gry.

---

## 4. Wyłączanie i Resetowanie Aplikacji

*   **Zatrzymanie działania (jeśli uruchomiono w okienku terminala)**: Naciśnij kombinację klawiszy `Ctrl + C` w oknie terminala, w którym działa Docker Compose.
*   **Zatrzymanie działania (jeśli uruchomiono w tle `-d`)**: Wpisz w terminalu w folderze projektu:
    ```cmd
    docker-compose stop
    ```
*   **Całkowity reset bazy danych i kontenerów**: Jeśli chcesz zatrzymać kontenery i całkowicie usunąć całą zawartość bazy danych (np. w celu ponownego pobrania piosenek/seedowania), wpisz:
    ```cmd
    docker-compose down -v
    ```

---

## 5. Tabela Portów i Adresów

Po uruchomieniu aplikacja działa pod następującymi adresami:

| Element Aplikacji | Adres URL | Port | Opis |
| :--- | :--- | :--- | :--- |
| **Aplikacja Gracza (Frontend)** | [http://localhost:5173](http://localhost:5173) | `5173` | Główny interfejs gry w przeglądarce |
| **Panel Administratora (Admin)** | [http://localhost:8000/admin/](http://localhost:8000/admin/) | `8000` | Panel Django (login: **`admin`**, hasło: **`admin`**) |
| **API Backend (Interfejs)** | [http://localhost:8000/api/](http://localhost:8000/api/) | `8000` | Punkty końcowe API REST |
| **Baza danych MariaDB** | `localhost` | `3306` | Dostęp do bazy (użytkownik: `pmq_user`, hasło: `pmq_password`) |
