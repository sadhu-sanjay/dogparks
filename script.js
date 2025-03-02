// --- Initialize the Map ---
const map = L.map("map").setView([62.0, 15.0], 5); // Center on Sweden
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// --- County Data ---
const counties = [
  { name: "Stockholm", value: "stockholm", lat: 59.3293, lng: 18.0686 },
  { name: "Uppsala", value: "uppsala", lat: 59.8586, lng: 17.6389 },
  { name: "Södermanland", value: "sodermanland", lat: 59.0, lng: 17.0 },
  {
    name: "Östergötland",
    value: "ostergotland",
    lat: 58.41,
    lng: 15.615,
  },
  { name: "Jönköping", value: "jonkoping", lat: 57.75, lng: 14.4667 },
  { name: "Kronoberg", value: "kronoberg", lat: 56.8833, lng: 14.6667 },
  { name: "Kalmar", value: "kalmar", lat: 56.68, lng: 16.3333 },
  { name: "Gotland", value: "gotland", lat: 57.5, lng: 18.5 },
  { name: "Blekinge", value: "blekinge", lat: 56.25, lng: 15.3333 },
  { name: "Skåne", value: "skane", lat: 55.8333, lng: 13.5 },
  { name: "Halland", value: "halland", lat: 56.8333, lng: 13.0 },
  {
    name: "Västra Götaland",
    value: "vastra_gotaland",
    lat: 58.0,
    lng: 12.5,
  },
  { name: "Värmland", value: "varmland", lat: 59.6667, lng: 13.0 },
  { name: "Örebro", value: "orebro", lat: 59.2741, lng: 15.2066 },
  { name: "Västmanland", value: "vastmanland", lat: 59.61, lng: 16.5467 },
  { name: "Dalarna", value: "dalarna", lat: 60.6667, lng: 15.0 },
  { name: "Gävleborg", value: "gavleborg", lat: 60.8333, lng: 17.0 },
  {
    name: "Västernorrland",
    value: "vasternorrland",
    lat: 62.6325,
    lng: 17.9242,
  },
  { name: "Jämtland", value: "jamtland", lat: 63.5, lng: 14.5 },
  {
    name: "Västerbotten",
    value: "vasterbotten",
    lat: 64.8333,
    lng: 18.0,
  },
  { name: "Norrbotten", value: "norrbotten", lat: 67.0, lng: 20.0 },
];

// --- Add a custom control for the county dropdown ---
const countyControl = L.control({ position: "topleft" }); // Different position

countyControl.onAdd = function (map) {
  const container = L.DomUtil.create(
    "div",
    "leaflet-control-county leaflet-bar"
  ); // Use leaflet-bar for styling
  const select = document.createElement("select");
  select.id = "countySelect";

  // Add the default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a County";
  select.appendChild(defaultOption);

  counties.forEach((county) => {
    const option = document.createElement("option");
    option.value = county.value;
    option.textContent = county.name;
    select.appendChild(option);
  });
  //Prevent map click.
  L.DomEvent.disableClickPropagation(container);
  container.appendChild(select);

  // Event listener for the county selection
  L.DomEvent.on(select, "change", async () => {
    const selectedCounty = select.value;
    if (!selectedCounty) return;

    const county = counties.find((c) => c.value === selectedCounty);
    if (!county) return;

    map.setView([county.lat, county.lng], 10);
    clearMarkers();
    const radius = 50000;
    findDogParks(county.lat, county.lng, radius);
  });
  return container;
};
countyControl.addTo(map);

let markers = []; // Store markers

function clearMarkers() {
  markers.forEach((marker) => {
    if (marker._popup) {
      // Check if popup exists before unbinding
      marker.unbindPopup();
    }
    map.removeLayer(marker);
  });
  markers = [];
}

// --- Add a custom control for the search button ---
const searchControl = L.control({ position: "topright" });

searchControl.onAdd = function (map) {
  const container = L.DomUtil.create(
    "div",
    "leaflet-control-search leaflet-bar"
  ); // Use leaflet-bar
  container.innerHTML =
    '<button id="searchButton"><i class="fa fa-search"></i>   Search in View</button>';
  //Prevent click.
  L.DomEvent.disableClickPropagation(container);

  // Event listener for the button *inside* the control
  L.DomEvent.on(container.firstChild, "click", () => {
    const bounds = map.getBounds();
    const center = bounds.getCenter();
    const radius = Math.min(30000, center.distanceTo(bounds.getNorthEast()));

    clearMarkers();
    setTimeout(() => {
      findDogParks(center.lat, center.lng, radius);
    }, 1000);
  });

  return container;
};

searchControl.addTo(map); // Add the control to the map

// --- Google Places API Search (using new v1 API) and Details ---
async function findDogParks(latitude, longitude, radius) {
  const apiKey = ""; // REPLACE WITH YOUR API KEY

  // --- Nearby Search ---
  const nearbySearchUrl =
    "https://places.googleapis.com/v1/places:searchNearby";
  const nearbySearchRequestBody = {
    includedTypes: ["dog_park"],
    maxResultCount: 20,
    locationRestriction: {
      circle: { center: { latitude, longitude }, radius },
    },
    languageCode: "en-US",
    regionCode: "SE",
  };

  try {
    const nearbySearchResponse = await fetch(nearbySearchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location,places.id", //Request placeId
      },
      body: JSON.stringify(nearbySearchRequestBody),
    });
    const nearbySearchData = await nearbySearchResponse.json();

    if (!nearbySearchResponse.ok) {
      console.error(
        "Google Places API error:",
        nearbySearchResponse.status,
        nearbySearchData
      );
      alert(
        `Error searching for dog parks: ${nearbySearchResponse.status} - ${
          nearbySearchData.error?.message || "See console for details."
        }`
      );
      return; // Exit if Nearby Search fails
    }

    if (!nearbySearchData.places || nearbySearchData.places.length === 0) {
      alert("No dog parks found in this area.");
      return; // Exit if no places found
    }

    // --- Place Details request for each place ---
    for (const place of nearbySearchData.places) {
      if (!place.id) continue;

      const placeDetailsUrl = `https://places.googleapis.com/v1/places/${place.id}?fields=photos,reviews,displayName,formattedAddress,location&key=${apiKey}&languageCode=en-US`;

      try {
        const detailsResponse = await fetch(placeDetailsUrl);
        const detailsData = await detailsResponse.json();

        if (!detailsResponse.ok) {
          console.error(
            "Error fetching place details",
            detailsResponse.status,
            detailsData
          );
          continue; //skip to next place.
        }

        if (detailsData.location) {
          // --- Create Marker with Enhanced Popup ---

          const dogIcon = L.icon({
            iconUrl: "happy.png", //Your local image
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          });

          const marker = L.marker(
            [detailsData.location.latitude, detailsData.location.longitude],
            { icon: dogIcon }
          );

          // --- Build Popup Content ---
          let popupContent = `<div class="popup-content">`;

          // Image
          if (detailsData.photos && detailsData.photos.length > 0) {
            //Construct the photo URL.  The new API returns photo *names*, not URLs.
            const photoName = detailsData.photos[0].name;
            const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxHeightPx=200&maxWidthPx=200`; //get medium sized image
            popupContent += `<img height="200px" width="200px"  auto"  src="${photoUrl}" alt="Dog Park Photo" class="popup-image"> </br>`;
          }

          // Name and Address
          popupContent += `<b>${
            detailsData.displayName?.text || "Dog Park"
          }</b><br>`;
          popupContent += `${detailsData.formattedAddress || ""}<br>`;

          // Reviews (with stars)
          if (detailsData.reviews && detailsData.reviews.length > 0) {
            const rating = calculateAverageRating(detailsData.reviews);
            popupContent += `<div class="stars">${getStars(rating)}</div>`; // Display stars
            popupContent += `<span>(${detailsData.reviews.length} reviews)</span><br>`;

            // Display a few reviews (e.g., the first 3)
            const numReviewsToShow = 2;
            for (
              let i = 0;
              i < Math.min(numReviewsToShow, detailsData.reviews.length);
              i++
            ) {
              const review = detailsData.reviews[i];
              popupContent += `<p><i>"${
                review.text?.text || "No review text"
              }"</i></p>`;
            }
          } else {
            popupContent += `<p>No reviews available.</p>`;
          }

          popupContent += `</div>`;

          // Bind popup and add to map.  Use autoPanPadding to handle height.
          marker
            .bindPopup(popupContent, {
              autoPanPadding: new L.Point(5, 50), // Add vertical padding
            })
            .addTo(map);
          markers.push(marker);

          // --- Close popup on map click or other marker click---
          map.on("click", () => {
            marker.closePopup();
          });
          marker.on("click", () => {
            markers.forEach((otherMarker) => {
              if (otherMarker !== marker) otherMarker.closePopup();
            });
          });
        } else {
          console.warn("Skipping place with missing location:", place);
        }
      } catch (detailsError) {
        console.error("Error fetching place details:", detailsError);
        //Consider adding a basic marker even if details fail.
      }
    } // End of for loop
  } catch (error) {
    console.error("Error fetching data:", error);
    alert("Error fetching dog park data. See console for details.");
  }
}

// --- Helper Functions for Ratings ---

function calculateAverageRating(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  let totalRating = 0;
  for (const review of reviews) {
    totalRating += review.rating; //New API use rating direclty
  }
  return totalRating / reviews.length;
}

function getStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  let starsHTML = "";
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>'; // Full star
  }
  if (halfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>'; // Half star
  }
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>'; // Empty star
  }
  return starsHTML;
}

// simulate a dropdown change
document.getElementById("countySelect").value = "stockholm";
document.getElementById("countySelect").dispatchEvent(new Event("change"));
