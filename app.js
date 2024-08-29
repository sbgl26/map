// Initialisation des cartes
const mapRoyalKids = L.map('map-royalKids').setView([48.8566, 2.3522], 12); // Carte Royal Kids
const mapUrbanJump = L.map('map-urbanJump').setView([48.8566, 2.3522], 12); // Carte Urban Jump

// Charger une carte de base depuis OpenStreetMap pour chaque carte
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(mapRoyalKids);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(mapUrbanJump);

let mainCityMarkerRoyalKids;
let mainCityMarkerUrbanJump;

const cityBoundaryLayers = {
    royalKids: {},
    urbanJump: {}
};

const zoneCityMarkers = {
    royalKids: [],
    urbanJump: []
};

const citiesData = {
    royalKids: {},
    urbanJump: {}
};

let activeMap = 'royalKids'; // Carte active par défaut

// Fonction pour rechercher une ville via Nominatim
function searchCity(cityName, callback) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=${encodeURIComponent(cityName)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const firstResult = data[0];
                const coords = [parseFloat(firstResult.lat), parseFloat(firstResult.lon)];
                const geojson = firstResult.geojson;
                callback(coords, cityName, geojson);
            } else {
                alert("Ville non trouvée !");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Erreur lors de la recherche de la ville !");
        });
}

// Sélectionner la ville mère
document.getElementById('select-city').addEventListener('click', function () {
    const cityName = document.getElementById('main-city').value;

    const mapInstance = activeMap === 'royalKids' ? mapRoyalKids : mapUrbanJump;
    let mainCityMarker = activeMap === 'royalKids' ? mainCityMarkerRoyalKids : mainCityMarkerUrbanJump;

    // Vérifier si la ville est déjà une ville de chalandise dans la carte active
    let isChalandiseCity = false;
    for (const mainCity in citiesData[activeMap]) {
        if (citiesData[activeMap][mainCity].zoneCities.some(zc => zc.name === cityName)) {
            isChalandiseCity = true;
            break;
        }
    }

    if (isChalandiseCity) {
        alert("Impossible d'ajouter cette ville comme ville mère car elle est déjà une ville de chalandise.");
        return;
    }

    searchCity(cityName, (coords, cityName, geojson) => {
        if (mainCityMarker) {
            mapInstance.removeLayer(mainCityMarker);
        }

        mainCityMarker = L.marker(coords).addTo(mapInstance).bindPopup(`Ville Mère: ${cityName}`).openPopup();
        mapInstance.setView(coords, 12);

        if (geojson) {
            if (cityBoundaryLayers[activeMap][cityName]) {
                mapInstance.removeLayer(cityBoundaryLayers[activeMap][cityName]);
            }
            cityBoundaryLayers[activeMap][cityName] = L.geoJSON(geojson, {
                style: {
                    color: activeMap === 'royalKids' ? '#3388ff' : '#ff0000',
                    weight: 2,
                    opacity: 0.5,
                    fillOpacity: 0.2,
                    fillColor: activeMap === 'royalKids' ? '#3388ff' : '#ff0000'
                }
            }).addTo(mapInstance);
        }

        // Ajouter au menu des villes
        if (!citiesData[activeMap][cityName]) {
            citiesData[activeMap][cityName] = { coords, geojson, zoneCities: [] };
            addCityToMenu(cityName);
        }

        // Mettre à jour le marqueur principal en fonction de la carte active
        if (activeMap === 'royalKids') {
            mainCityMarkerRoyalKids = mainCityMarker;
        } else {
            mainCityMarkerUrbanJump = mainCityMarker;
        }
    });
});

// Ajouter une ville à la zone de chalandise
document.getElementById('add-zone-city').addEventListener('click', function () {
    const cityName = document.getElementById('zone-city').value;

    const mapInstance = activeMap === 'royalKids' ? mapRoyalKids : mapUrbanJump;

    // Vérifier si la ville est déjà utilisée comme chalandise pour une autre ville mère dans la carte active
    let isAlreadyChalandise = false;
    for (const mainCity in citiesData[activeMap]) {
        if (citiesData[activeMap][mainCity].zoneCities.some(zc => zc.name === cityName)) {
            isAlreadyChalandise = true;
            break;
        }
    }

    if (isAlreadyChalandise) {
        alert("Impossible d'ajouter cette ville comme ville de chalandise car elle est déjà utilisée pour une autre ville mère.");
        return;
    }

    searchCity(cityName, (coords, cityName, geojson) => {
        const marker = L.marker(coords).addTo(mapInstance).bindPopup(`Ville de Chalandise: ${cityName}`).openPopup();
        zoneCityMarkers[activeMap].push(marker);

        // Ajouter la ville à la liste dans l'interface et dans le menu des villes
        const mainCityName = document.getElementById('main-city').value;
        if (citiesData[activeMap][mainCityName]) {
            citiesData[activeMap][mainCityName].zoneCities.push({ name: cityName, coords, geojson });
            addZoneCityToMenu(mainCityName, cityName);
        }

        if (geojson) {
            if (cityBoundaryLayers[activeMap][cityName]) {
                mapInstance.removeLayer(cityBoundaryLayers[activeMap][cityName]);
            }
            cityBoundaryLayers[activeMap][cityName] = L.geoJSON(geojson, {
                style: {
                    color: activeMap === 'royalKids' ? '#ff7800' : '#ff00ff',
                    weight: 2,
                    opacity: 0.5,
                    fillOpacity: 0.2,
                    fillColor: activeMap === 'royalKids' ? '#ff7800' : '#ff00ff'
                }
            }).addTo(mapInstance);
        }
    });
});

// Ajouter une ville principale au menu
function addCityToMenu(cityName) {
    const cityList = document.getElementById('city-list');
    let li = document.getElementById(`city-${cityName}-${activeMap}`);

    // Vérifie si la ville mère est déjà dans la liste
    if (!li) {
        li = document.createElement('li');
        li.id = `city-${cityName}-${activeMap}`;
        li.innerHTML = `
            ${cityName}
            <button onclick="deleteCity('${cityName}', 'main', '${activeMap}')">Supprimer</button>
        `;

        // Ajouter la sous-liste des villes de chalandise
        const subUl = document.createElement('ul');
        subUl.className = 'zone-city-list';
        li.appendChild(subUl);

        li.addEventListener('click', function () {
            // Basculer la visibilité des villes de chalandise
            subUl.classList.toggle('active');
        });

        cityList.appendChild(li);
    }
}

// Ajouter une ville de zone de chalandise au menu sous la ville principale
function addZoneCityToMenu(mainCityName, zoneCityName) {
    const li = document.getElementById(`city-${mainCityName}-${activeMap}`);

    if (li) {
        const ul = li.querySelector('.zone-city-list');

        // Vérifie si la ville de chalandise est déjà dans la liste
        let subLi = document.getElementById(`zone-city-${zoneCityName}-${activeMap}`);
        if (!subLi) {
            subLi = document.createElement('li');
            subLi.id = `zone-city-${zoneCityName}-${activeMap}`;
            subLi.innerHTML = `
                ${zoneCityName}
                <button onclick="deleteCity('${zoneCityName}', 'zone', '${mainCityName}', '${activeMap}')">Supprimer</button>
            `;
            subLi.className = 'zone-city';
            subLi.addEventListener('click', function (e) {
                e.stopPropagation(); // Empêche le clic de se propager à la ville principale
                navigateToCity(mainCityName, zoneCityName);
            });
            ul.appendChild(subLi);
        }
    }
}

// Fonction pour supprimer une ville (mère ou de chalandise)
function deleteCity(cityName, type, mainCityName = null, mapType = activeMap) {
    const mapInstance = mapType === 'royalKids' ? mapRoyalKids : mapUrbanJump;

    if (type === 'main') {
        // Supprimer la ville mère et toutes ses villes de chalandise
        if (cityBoundaryLayers[mapType][cityName]) {
            mapInstance.removeLayer(cityBoundaryLayers[mapType][cityName]);
            delete cityBoundaryLayers[mapType][cityName];
        }
        if (citiesData[mapType][cityName]) {
            citiesData[mapType][cityName].zoneCities.forEach(zoneCity => {
                if (cityBoundaryLayers[mapType][zoneCity.name]) {
                    mapInstance.removeLayer(cityBoundaryLayers[mapType][zoneCity.name]);
                    delete cityBoundaryLayers[mapType][zoneCity.name];
                }
            });
            delete citiesData[mapType][cityName];
        }
        const li = document.getElementById(`city-${cityName}-${mapType}`);
        if (li) {
            li.remove();
        }
    } else if (type === 'zone' && mainCityName) {
        // Supprimer une ville de chalandise
        const cityData = citiesData[mapType][mainCityName];
        if (cityData) {
            const zoneCityIndex = cityData.zoneCities.findIndex(zc => zc.name === cityName);
            if (zoneCityIndex > -1) {
                const [removedCity] = cityData.zoneCities.splice(zoneCityIndex, 1);
                if (cityBoundaryLayers[mapType][removedCity.name]) {
                    mapInstance.removeLayer(cityBoundaryLayers[mapType][removedCity.name]);
                    delete cityBoundaryLayers[mapType][removedCity.name];
                }
            }
        }
        const subLi = document.getElementById(`zone-city-${cityName}-${mapType}`);
        if (subLi) {
            subLi.remove();
        }
    }
}

// Naviguer vers une ville ou une zone de chalandise
function navigateToCity(cityName, zoneCityName = null) {
    const mapInstance = activeMap === 'royalKids' ? mapRoyalKids : mapUrbanJump;
    const cityData = citiesData[activeMap][cityName];

    if (cityData) {
        // Centrer sur la ville principale ou une ville de la zone
        let coords = cityData.coords;

        if (zoneCityName) {
            const zoneCity = cityData.zoneCities.find(zc => zc.name === zoneCityName);
            if (zoneCity) {
                coords = zoneCity.coords;
            }
        }

        mapInstance.setView(coords, 12);

        // Conserver les contours existants
        if (activeMap === 'royalKids' && mainCityMarkerRoyalKids) {
            mapInstance.removeLayer(mainCityMarkerRoyalKids);
        }
        if (activeMap === 'urbanJump' && mainCityMarkerUrbanJump) {
            mapInstance.removeLayer(mainCityMarkerUrbanJump);
        }

        const newMarker = L.marker(coords).addTo(mapInstance).bindPopup(`${zoneCityName || cityName}`).openPopup();

        if (activeMap === 'royalKids') {
            mainCityMarkerRoyalKids = newMarker;
        } else {
            mainCityMarkerUrbanJump = newMarker;
        }
    }
}

// Changer de carte active
document.getElementById('select-map').addEventListener('change', function () {
    activeMap = this.value;
    updateTheme();
    updateMap();
    updateCityList(); // Mettre à jour la liste des villes dans l'interface
});

// Mettre à jour le thème selon la carte active
function updateTheme() {
    const body = document.body;

    if (activeMap === 'royalKids') {
        body.classList.remove('theme-urban-jump');
        body.classList.add('theme-royal-kids');
    } else if (activeMap === 'urbanJump') {
        body.classList.remove('theme-royal-kids');
        body.classList.add('theme-urban-jump');
    }
}

// Mettre à jour la carte selon la carte active
function updateMap() {
    // Masquer les deux cartes
    document.getElementById('map-royalKids').style.display = 'none';
    document.getElementById('map-urbanJump').style.display = 'none';

    // Retirer les marqueurs et les couches de la carte précédente
    const previousMap = activeMap === 'royalKids' ? mapUrbanJump : mapRoyalKids;
    Object.values(cityBoundaryLayers[activeMap === 'royalKids' ? 'urbanJump' : 'royalKids']).forEach(layer => previousMap.removeLayer(layer));
    zoneCityMarkers[activeMap === 'royalKids' ? 'urbanJump' : 'royalKids'].forEach(marker => previousMap.removeLayer(marker));
    
    if (activeMap === 'royalKids' && mainCityMarkerUrbanJump) {
        previousMap.removeLayer(mainCityMarkerUrbanJump);
    } else if (activeMap === 'urbanJump' && mainCityMarkerRoyalKids) {
        previousMap.removeLayer(mainCityMarkerRoyalKids);
    }

    // Afficher la carte active
    const mapInstance = activeMap === 'royalKids' ? mapRoyalKids : mapUrbanJump;
    document.getElementById(`map-${activeMap}`).style.display = 'block';

    // Réinitialiser la carte
    setTimeout(() => {
        mapInstance.invalidateSize();
    }, 200);
}

// Mettre à jour la liste des villes dans l'interface en fonction de la carte active
function updateCityList() {
    const cityList = document.getElementById('city-list');
    cityList.innerHTML = ''; // Effacer la liste actuelle

    // Ajouter les villes et les zones de chalandise de la carte active à la liste
    for (const cityName in citiesData[activeMap]) {
        const li = document.createElement('li');
        li.id = `city-${cityName}-${activeMap}`;
        li.innerHTML = `
            ${cityName}
            <button onclick="deleteCity('${cityName}', 'main', '${activeMap}')">Supprimer</button>
        `;

        // Ajouter la sous-liste des villes de chalandise
        const subUl = document.createElement('ul');
        subUl.className = 'zone-city-list';

        // Ajouter les zones de chalandise associées
        citiesData[activeMap][cityName].zoneCities.forEach(zoneCity => {
            const subLi = document.createElement('li');
            subLi.id = `zone-city-${zoneCity.name}-${activeMap}`;
            subLi.innerHTML = `
                ${zoneCity.name}
                <button onclick="deleteCity('${zoneCity.name}', 'zone', '${cityName}', '${activeMap}')">Supprimer</button>
            `;
            subLi.className = 'zone-city';
            subLi.addEventListener('click', function (e) {
                e.stopPropagation(); // Empêche le clic de se propager à la ville principale
                navigateToCity(cityName, zoneCity.name);
            });
            subUl.appendChild(subLi);
        });

        li.appendChild(subUl);

        li.addEventListener('click', function () {
            // Basculer la visibilité des villes de chalandise
            subUl.classList.toggle('active');
        });

        cityList.appendChild(li);
    }
}

// Initialiser le thème lors du chargement de la page
updateTheme();