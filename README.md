# 🎵 PAINT Music Quiz

![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Django](https://img.shields.io/badge/django-%23092E20.svg?style=for-the-badge&logo=django&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)

Witamy w **PAINT Music Quiz** – nowoczesnej aplikacji webowej do quizów muzycznych! Sprawdź swoją wiedzę o muzyce, odgadując tytuły piosenek i wykonawców na podstawie krótkich, 15-sekundowych fragmentów audio.

---

## 🚀 O Projekcie

PAINT Music Quiz to w pełni funkcjonalna gra typu "Jaka to melodia", stworzona z myślą o świetnej zabawie w gronie znajomych.
System automatycznie pobiera fragmenty muzyczne dzięki integracji z **iTunes API** i udostępnia gotowe playlisty do gry!

### ✨ Główne cechy:
- **Rozgrywka oparta na próbkach**: Zgaduj na podstawie 30-sekundowych fragmentów piosenek (domyślny czas na odpowiedź to 15s).
- **Gotowe Quizy**: Baza automatycznie inicjuje się z popularnymi playlistami (m.in. Quebonafide, Taco Hemingway, Rap Life).
- **Bezpieczny start**: Domyślnie pierwsze 2 sekundy to "bezpieczny obszar", w którym nie tracisz punktów!
- **Panel Administratora**: Wygodne zarządzanie quizami, czasem na odpowiedź i utworami w panelu Django.
- **Skonteneryzowana Architektura**: Dzięki Dockerowi aplikację uruchomisz w dowolnym środowisku jednym poleceniem!

---

## 🛠 Technologie

Projekt został zbudowany z wykorzystaniem nowoczesnego stosu technologicznego:
- **Frontend:** React + Vite, czysty Vanilla CSS do stylowania.
- **Backend:** Python + Django REST Framework (DRF) dostarczający niezawodne API.
- **Baza Danych:** MariaDB (lekka, szybka i wydajna relacyjna baza danych).
- **Infrastruktura:** Docker & Docker Compose (pełna automatyzacja uruchamiania).

---

## 📦 Instalacja i Uruchomienie (Windows)

Poniżej znajduje się kompletny przewodnik, jak uruchomić aplikację lokalnie. Projekt działa w kontenerach Docker, dlatego nie musisz ręcznie konfigurować środowiska Python czy Node.js!

### 1. Wymagania wstępne (WSL 2 i Docker Desktop)
Jeśli jeszcze nie masz Dockera:
1. Uruchom **PowerShell jako administrator** i wpisz: `wsl --install`
2. Zrestartuj komputer i skonfiguruj system Ubuntu w terminalu.
3. Pobierz i zainstaluj [Docker Desktop dla Windows](https://www.docker.com/products/docker-desktop/).
4. Podczas instalacji **zaznacz opcję "Use WSL 2 instead of Hyper-V"**.
5. Uruchom Docker Desktop i upewnij się, że silnik Dockera działa (zielona ikona).

### 2. Przygotowanie pliku konfiguracyjnego
W głównym katalogu projektu utwórz plik o nazwie `.env` (bez żadnego rozszerzenia!) i wklej do niego:

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

### 3. Uruchomienie Serwerów 🚀

Otwórz terminal w folderze głównym projektu i wpisz:

```bash
docker-compose up --build
```
> **Wskazówka**: Jeśli chcesz, aby aplikacja działała w tle (nie blokowała terminala), użyj `docker-compose up -d`. Opcja `--build` jest wymagana tylko przy pierwszym uruchomieniu lub przy zmianach w kodzie.

Docker automatycznie:
- Pobierze obrazy bazy danych.
- Zainstaluje zależności dla backendu i frontendu.
- Wykona migracje oraz **automatycznie pobierze utwory** do bazy z Apple Music.

Gdy zobaczysz komunikat o gotowości (np. `VITE ready`), gra jest gotowa!

---

## 🎮 Gdzie znaleźć aplikację?

Po uruchomieniu, z aplikacji możesz korzystać używając poniższych linków:

| Komponent | Adres URL | Port | Opis |
| :--- | :--- | :--- | :--- |
| **🎵 Gra (Frontend)** | [http://localhost:5173](http://localhost:5173) | `5173` | Główny interfejs gry w przeglądarce |
| **⚙️ Panel Admina** | [http://localhost:8000/admin/](http://localhost:8000/admin/) | `8000` | Logowanie: **`admin`** / Hasło: **`admin`** |
| **🔌 API Backend** | [http://localhost:8000/api/](http://localhost:8000/api/) | `8000` | Punkty końcowe API |
| **🗄️ Baza MariaDB** | `localhost` | `3306` | Użytkownik: `pmq_user`, Hasło: `pmq_password` |

---

## 🛑 Wyłączanie i zarządzanie

- **Zatrzymanie (tryb zwykły)**: Użyj skrótu `Ctrl + C` w terminalu.
- **Zatrzymanie (tryb w tle)**: Wpisz `docker-compose stop`.
- **Całkowity reset**: Aby skasować kontenery oraz zresetować bazę danych (np. by ponownie pobrać seed danych), wpisz: 
  ```bash
  docker-compose down -v
  ```

---
Miłej zabawy i udanego zgadywania! 🎶✨
