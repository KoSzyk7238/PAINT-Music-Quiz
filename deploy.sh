#!/bin/bash
# Skrypt do automatycznej aktualizacji i wdrażania projektu na serwerze Ubuntu

echo "=== Rozpoczynanie wdrażania ==="

# 1. Wyczyszczenie tymczasowych zmian w settings.py, aby zapobiec konfliktom gita
echo "Rewertowanie tymczasowych plików..."
git checkout -- moj_backend/settings.py

# 2. Pobranie najnowszego kodu z repozytorium
echo "Pobieranie najnowszego kodu z Git..."
git pull

# 3. Dodanie konfiguracji domeny produkcyjnej do settings.py
echo "Konfigurowanie ustawień domeny w settings.py..."
echo -e "\nCSRF_TRUSTED_ORIGINS.append('https://jakitosygnal.app')\nCORS_ALLOWED_ORIGINS = ['https://jakitosygnal.app']" >> moj_backend/settings.py

# 4. Uruchomienie i przebudowanie kontenerów Docker
echo "Restartowanie i budowanie kontenerów Docker..."
docker compose up -d --build

# 5. Oczekiwanie na uruchomienie kontenera frontendu
echo "Oczekiwanie na uruchomienie frontendu..."
sleep 3

# 6. Kompilacja wersji produkcyjnej frontendu wewnątrz kontenera
# (Aktualizuje katalog frontend/dist/ na serwerze)
echo "Kompilowanie wersji produkcyjnej frontendu (npm run build)..."
docker compose exec -T frontend npm run build

echo "=== Wdrożenie zakończone pomyślnie! ==="
