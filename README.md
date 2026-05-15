# PAINT-Music-Quiz

Projekt składa się z backendu napisanego w Pythonie (Django), frontendu opartego na Node.js (Vite/React) oraz bazy danych MariaDB. Całość jest konteneryzowana i zarządzana przy użyciu narzędzia Docker Compose, co ułatwia uruchomienie całego środowiska.

Poniższa instrukcja krok po kroku opisuje, jak zainstalować niezbędne narzędzia (WSL 2 i Docker Desktop) w systemie Windows, a następnie uruchomić aplikację.

## 1. Wymagania wstępne (Instalacja WSL 2 i Dockera na Windows)

Zanim uruchomisz aplikację na systemie Windows, musisz przygotować środowisko, instalując **WSL 2** (Windows Subsystem for Linux) oraz **Docker Desktop**.

### Krok 1: Instalacja WSL 2
1. Otwórz menu Start, wyszukaj **PowerShell**, kliknij na niego prawym przyciskiem myszy i wybierz **Uruchom jako administrator**.
2. Wpisz poniższe polecenie i naciśnij Enter:
   ```bash
   wsl --install
   ```
3. Poczekaj na zakończenie procesu. To polecenie automatycznie włączy wymagane funkcje systemu, zainstaluje WSL 2 i domyślną dystrybucję Linuksa (zazwyczaj Ubuntu).
4. **Uruchom ponownie komputer**. Po restarcie może otworzyć się okno terminala w celu dokończenia instalacji Ubuntu (utworzenie nazwy użytkownika i hasła). Możesz je wypełnić, chociaż sam Docker poradzi sobie bez ręcznej konfiguracji dystrybucji.

*Jeśli napotkasz problemy z `wsl --install`, upewnij się, że masz zaktualizowany system Windows 10/11.*

### Krok 2: Instalacja Docker Desktop
1. Wejdź na oficjalną stronę Dockera: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/) i pobierz wersję dla systemu **Windows**.
2. Uruchom pobrany instalator (`Docker Desktop Installer.exe`).
3. Podczas instalacji upewnij się, że opcja **Use WSL 2 instead of Hyper-V** (lub podobna odnosząca się do WSL 2) jest **zaznaczona**.
4. Po zakończeniu instalacji **uruchom ponownie komputer** (jeśli instalator o to poprosi).
5. Uruchom aplikację **Docker Desktop** (najlepiej z menu Start) i zaakceptuj warunki licencji. 
6. (Opcjonalnie) Docker może poprosić o zalogowanie się, ale w większości przypadków możesz używać go bez konta, wybierając opcję "Continue without signing in". Po uruchomieniu ikona Dockera (wieloryb) powinna pojawić się w zasobniku systemowym (obok zegara).

Upewnij się w **ustawieniach Docker Desktop (ikona zębatki)** -> **General**, że pole **Use the WSL 2 based engine** jest zaznaczone.

## 2. Przygotowanie konfiguracji aplikacji

Projekt wymaga pliku `.env`, który zawiera zmienne środowiskowe, takie jak hasła do bazy danych. Z racji, że z reguły nie trzyma się haseł w repozytorium, musisz ten plik utworzyć samodzielnie.

1. W głównym folderze projektu (tam gdzie znajduje się plik `docker-compose.yml`) utwórz nowy plik o nazwie `.env`.
2. Otwórz plik w dowolnym edytorze tekstowym (np. Notatnik, Visual Studio Code) i wklej do niego następującą podstawową konfigurację:

```env
# Plik .env w katalogu głównym projektu
MARIADB_ROOT_PASSWORD=mojetajnehaslo
MARIADB_DATABASE=music_quiz_db
MARIADB_USER=quiz_user
MARIADB_PASSWORD=quiz_password
```
*(Zmienne dopasuj w zależności od tego, czego wymaga backend w pliku settings.py. Pamiętaj, aby wartości tu ustalone pokrywały się z wymaganiami bazy i backendu).*

## 3. Uruchamianie projektu

Gdy masz już uruchomionego Dockera i przygotowany plik `.env`, uruchomienie projektu sprowadza się do wykonania jednego polecenia.

1. Otwórz terminal (najlepiej wbudowany terminal w Twoim IDE, np. Visual Studio Code, Android Studio albo PowerShell) i przejdź do folderu z głównym katalogiem projektu.
2. Wpisz komendę:
   ```bash
   docker-compose up --build
   ```
   *(Flaga `--build` spowoduje, że obrazy kontenerów zbudują się na nowo, co jest wymagane przy pierwszym uruchomieniu)*
3. Docker zacznie pobierać niezbędne obrazy, tworzyć kontenery i instalować pakiety wewnątrz nich. Może to potrwać kilka minut.
4. Po zakończeniu budowy logi powinny przestać gwałtownie pędzić, a w terminalu powinieneś zobaczyć m.in. informację o uruchomionym serwerze z Django oraz frontendzie.

### Adresy po uruchomieniu:
- **Frontend (Aplikacja użytkownika):** [http://localhost:5173](http://localhost:5173)
- **Backend (API):** [http://localhost:8000](http://localhost:8000)

## 4. Wyłączanie projektu

Aby zatrzymać aplikację:
1. W terminalu, w którym działa serwer, wciśnij kombinację klawiszy `Ctrl + C`. 
2. Kontenery zostaną zatrzymane, jednakże baza danych (oraz jej zawartość) pozostaną zachowane na dysku.

Jeżeli z jakiegoś powodu zechcesz **całkowicie zresetować kontenery oraz usunąć bazę danych**, wpisz:
```bash
docker-compose down -v
```

## 5. Rozwiązywanie problemów

- **Problem z portami:** Jeżeli otrzymasz błąd, że "port is already allocated", oznacza to, że jakaś inna aplikacja na Twoim komputerze używa już portów `8000`, `5173` lub `3306`. Musisz je zwolnić.
- **Problem z prawami do Dockera na Windows:** Pamiętaj, by Docker Desktop był stale włączony podczas korzystania z `docker-compose`. Jeśli dostajesz błąd typu *Docker daemon is not running*, upewnij się, że aplikacja Docker Desktop działa w tle.
