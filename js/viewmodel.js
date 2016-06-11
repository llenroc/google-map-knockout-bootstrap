define(['knockout', 'locations', 'jquery', 'domReady'], function(ko, locations, $) {
    return function appViewModel() {
    	var self = this;
    	// Fetch initial array of locations from locations.js
    	var places = locations.getLocations();
    
    	// *** GOOGLE MAPS ***
		var map;
		// Store all the map markers in an array
		self.markers = [];

		// Helper HTML for the infowindow contents
		var HTMLinfoWindow = '<div class="info-window">%data%</div>';

		var initMap = function() {
		    map = new google.maps.Map(document.getElementById('map'), {
		        center: {lat: 52.3610647, lng: -3.7881769},
		        zoom: 11
		    });
		};

		initMap();

		// Calls the createMapMarker function for each place in the places array
		function pinPoster(places){
			for (var place in places) {		
				createMapMarker(places[place]);
			}
		}

		// Creates and places a single map marker
		function createMapMarker(place) {

			// Define and place a marker
			// Each marker also comes with the property visible: true
			var marker = new google.maps.Marker({
				map: map,
				position: place.location,
				name: place.name,
			});

			// Create an infowindow and populate the HTML with the relevant place name
			var infoWindow = new google.maps.InfoWindow({
				content: HTMLinfoWindow.replace("%data%", place.name),
			});

			// Open the infowindow when a marker is clicked
			google.maps.event.addListener(marker, 'click', function(){
				self.selectPlace(place);
				infoWindow.open(map, marker);			
			});

			// Associate the infoWindow with its marker, and add the marker to the markers array
			marker.infoWindow = infoWindow;		
			self.markers.push(marker);
		}

		pinPoster(places);

		function isInfoWindowOpen(infoWindow){
    		var map = infoWindow.getMap();
    		return (map !== null && typeof map !== "undefined");
		}

		self.filterMarkers = function(){
			// Switch visible property of markers on and off depending on whether the place is
			// In the knockout filteredPlaces array
			// (Could use a library utility function for this, rather than two nested forEach loops?)
			self.markers.forEach(function(marker){
				var infoWindowOpen = isInfoWindowOpen(marker.infoWindow);
				// First set visibility to false, and close all infowindows
				marker.setVisible(false);
				marker.infoWindow.close(map, marker);
				// Then if it corresponds to a place in the filtered list of places, set visibility back to true
				self.filteredPlaces().forEach(function(place){
					if (marker.name == place.name){
						marker.setVisible(true);
						if (infoWindowOpen){
							marker.infoWindow.open(map, marker);
						}
						
					}
				})
			})
			// Allow default event handling
			return true;
		}

		// *** KNOCKOUT ***

		// Create an observable array of places
		self.observablePlaces = ko.observableArray(places);
		// Create an observable to hold the text typed into the filter box
		self.filterInput = ko.observable("");
		// Create a filtered array of places
		self.filteredPlaces = ko.computed(function(){
        	return ko.utils.arrayFilter(self.observablePlaces(), function(place) {
            	return (( place.name.toLowerCase().indexOf(self.filterInput().toLowerCase()) != -1 ) || 
            		(place.type.toLowerCase().indexOf(self.filterInput().toLowerCase()) != -1))
        	});
		});

		self.selectedPlace = ko.observable({ name: "", images: [""], fourSqData: { got: false, url: "" } });

		self.selectPlace = function(clickedPlace){ 
			if (!clickedPlace.fourSqData){
				self.getFourSqData(clickedPlace);
				self.selectedPlace(clickedPlace);		
			}
			else {
				self.selectedPlace(clickedPlace);
				self.fourSqData(clickedPlace.fourSqData);
			}
			self.selectMarker();

		};

		self.selectedMarker = ko.computed(function(){
			return ko.utils.arrayFirst(self.markers, function(marker) {
            	return ( marker.name == self.selectedPlace().name );
        	});
		});
		
		// Animate a marker and open its infowindow when it is clicked
		self.selectMarker = function(){
			var currentMarker = self.selectedMarker();
			self.markers.forEach(function(marker){
				if (marker != currentMarker){
					marker.setAnimation(null);
				}
			});
			currentMarker.setAnimation(google.maps.Animation.BOUNCE);
			currentMarker.infoWindow.open(map, currentMarker);
		}

		// Create an observable that holds the current foursquare data to display
		self.fourSqData = ko.observable({
			url: "url here",
			imgSrc: ""
		});

		// *** FOURSQUARE API ***

		var fourSqUrl = "https://api.foursquare.com/v2/venues/";
		var fourSqClientId = "1Z0V4PX11GK3JIEOMVMKJWYS1LOLTZHHWENWKDAQKRJQ1B1K";
		// NEED TO SECURE THIS
		var fourSqClientSt = "X11PKDW53IBYLDHFXFXE12PL2N0F4NC3A5LMLXY2HCWFFQ4P";
		
		var url, VENUE_ID;

		self.getFourSqData = function(place){
			VENUE_ID = place.fourSq_VENUE_ID;
			url = fourSqUrl + VENUE_ID + "?client_id=" + fourSqClientId + "&client_secret=" + fourSqClientSt + "&v=20160609";
			$.getJSON(url, function(data){
				var usefulData = {
					url: data.response.venue.url || "No URL given",
					imgSrc: data.response.venue.bestPhoto.prefix + "200x200" + data.response.venue.bestPhoto.suffix
				}
				// Set the current foursquare data
				self.fourSqData(usefulData);
				// And cache it in the places array
				place.fourSqData = usefulData;

			}).fail(function(){console.log("error");});
		}
    }
});




