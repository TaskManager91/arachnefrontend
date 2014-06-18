'use strict';

/* Directives */
angular.module('arachne.directives', []).
	directive('imagesrow', function($window) {
		return {
			restrict: 'A',
			link: function (scope, element, attrs) {

				var width 				= element[0].clientWidth;
				var images 				= element[0].getElementsByTagName('img');
				var imagesLeftToLoad 	= images.length;


				var listener = function () {
					if(imagesLeftToLoad != 0) imagesLeftToLoad--;

					// BREAK if there are any images left to be loaded
					if (imagesLeftToLoad != 0) return;

					var scalingPercentage = 0, imagesWidth = 0;
					for (var i = images.length - 1; i >= 0; i--) {
						// 4 is padding of image
						imagesWidth += images[i].width;
					};
					// 30 is padding of container
					scalingPercentage = (element.parent()[0].clientWidth-30) / (imagesWidth / 100);
					for (var i = images.length - 1; i >= 0; i--) {
						var newWidth =  (images[i].width/101)*scalingPercentage;
						images[i].width = newWidth;
						images[i].style.display = 'block';
						images[i].parentNode.parentNode.style.width = newWidth + "px";
						images[i].removeEventListener("load", listener, false);

					};
					
				};
				

				// watching for element resizing
				// important for context modal, where the filter comes in from the side and resizes the content
				scope.$watch(function(){
					if(element[0].clientWidth != width) {
						width = element[0].clientWidth;
						listener()		
					}
				});

				// watching for window resizing
				// important for the restults
				angular.element($window).bind('resize', function() {
					listener()
				});
				

				for (var i = images.length - 1; i >= 0; i--) {
					images[i].addEventListener(
						"load",
						listener,
						false);
					
				}
			}
		}

	})
	// Parameters:
	// + imageId
	// + link
	// + placeholderIfEmpty
	// - arachneimagerequest
	// - arachneimageheight
	.directive('arachneimagerequest', ['arachneSettings', function(arachneSettings) {
  		return {
  			restrict: 'A',

    		link: function(scope, element, attrs) {
    			var newElement = '';
    			//DIRTY workaround for iterations on things that does not exsist, maybe
    			// handle tiles without data
    			if(attrs.isPlaceholderIfEmpty == "") {
    				newElement = '<span style="display:none"><img src="img/imagePlaceholder.png"></span>';
 				} else {
	       			if(attrs.imageid) {
	       				newElement = '<a href="'+attrs.link+'"><img src="'+arachneSettings.dataserviceUri+'/image/'+attrs.arachneimagerequest+'/'  + attrs.imageid + '?'  + attrs.arachneimagerequest + '=' + attrs.arachneimageheight + '"></a>';
	       			} else {
	       				newElement = '<a href="'+attrs.link+'"><img src="img/imagePlaceholder.png"></a>';
	       			}
	       		}
       			element.prepend(angular.element(newElement));
    		}
  		}
	}])
	.directive('map', ['$location', function($location) {
    return {
        restrict: 'A',
        scope: {
        	searchresults: '=',
        	entities: '=',
        },
        link: function(scope) 
        {	
        	
        	var map = L.map('map').setView([40, -10], 3);

			var layer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		        maxZoom: 18
		    });
		    map.addLayer(layer);			
        	L.Icon.Default.imagePath = 'img';

			var createMarkers = function(facet_geoValues){
				var markerClusterGroup = new L.MarkerClusterGroup(
				{
				    iconCreateFunction: function(cluster) {

				        var markers = cluster.getAllChildMarkers();
						var entityCount = 0;
						for (var i = 0; i < markers.length; i++) {
							entityCount += markers[i].options.entityCount;
						}

						var childCount = cluster.getChildCount();

						var c = ' marker-cluster-';
						if (childCount < 10) {
							c += 'small';
						} else if (childCount < 100) {
							c += 'medium';
						} else {
							c += 'large';
						}

						return new L.DivIcon({ html: '<div><span>' + entityCount+ ' at ' + childCount + ' Places</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
				    }
				});

				for (var i = facet_geoValues.length - 1; i >= 0; i--) {

					var facetValue = facet_geoValues[i];
					var coordsString = facetValue.value.substring(facetValue.value.indexOf("[", 1)+1, facetValue.value.length - 1);
					var coords = coordsString.split(',');
					var title = "<b>" + facetValue.value.substring(0, facetValue.value.indexOf("[", 1)-1) + "</b><br/>";
					title += "Einträge, <b>insgeamt</b>: " + facetValue.count + "<br>";
					if($location.$$search.fq)
						title += "<a href='search?q=*&fq="+$location.$$search.fq+",facet_geo:\"" + facetValue.value +  "\"'>Diese Einträge anzeigen</a>";
					else
						title += "<a href='search?q=*&fq=facet_geo:\"" + facetValue.value +  "\"'>Diese Einträge anzeigen</a>";
					
					var marker = L.marker(new L.LatLng(coords[0], coords[1]), { title: title, entityCount : facetValue.count });
					marker.bindPopup(title);
					markerClusterGroup.addLayer(marker);
				}
				if(facet_geoValues.length == 1)
				{
					var facetValue = facet_geoValues[0];
					var coordsString = facetValue.value.substring(facetValue.value.indexOf("[", 1)+1, facetValue.value.length - 1);
					var coords = coordsString.split(',');
					map.setView(coords, 6);
				}

				map.addLayer(markerClusterGroup);
				map.invalidateSize();
			}

			if(scope.searchresults)
        	{
        		for (var i = scope.searchresults.facets.length - 1; i >= 0; i--) {
					if(scope.searchresults.facets[i].name === "facet_geo") {
						console.log(scope.searchresults.facets[i].values);
						createMarkers(scope.searchresults.facets[i].values);
						break;
					}
				};
        	}
        	if(scope.entities)
        	{
        		var facet_geo = Array();
        		for (var i = scope.entities.length - 1; i >= 0; i--) {

        			facet_geo.push({value: scope.entities[i].facet_geo[0], count: 1});
        		}
        		createMarkers(facet_geo);
        	}      	
        }
    };
	}])	
	.directive('zoomifyimg', ['arachneSettings', function(arachneSettings) {
    	return {
	        restrict: 'A',
	        link: function(scope, element, attrs) 
	        {
				/*
				 * L.TileLayer.Zoomify display Zoomify tiles with Leaflet
				 */
				L.TileLayer.Zoomify = L.TileLayer.extend({
					options: {
						continuousWorld: true,
						tolerance: 0.8
					},
					initialize: function (entityId, options) {
						options = L.setOptions(this, options);
						this._entityId = entityId;

				    	var imageSize = L.point(options.width, options.height),
					    	tileSize = options.tileSize;

				    	this._imageSize = [imageSize];
				    	this._gridSize = [this._getGridSize(imageSize)];

				        while (parseInt(imageSize.x) > tileSize || parseInt(imageSize.y) > tileSize) {
				        	imageSize = imageSize.divideBy(2).floor();
				        	this._imageSize.push(imageSize);
				        	this._gridSize.push(this._getGridSize(imageSize));
				        }

						this._imageSize.reverse();
						this._gridSize.reverse();

				        this.options.maxZoom = this._gridSize.length - 1;
				        var southWest = map.unproject([0, options.height], this.options.maxZoom);
						var northEast = map.unproject([options.width, 0], this.options.maxZoom);
						map.setMaxBounds(new L.LatLngBounds(southWest, northEast));

					},
					onAdd: function (map) {
						L.TileLayer.prototype.onAdd.call(this, map);
						var mapSize = map.getSize(),
							zoom = this._getBestFitZoom(mapSize),
							imageSize = this._imageSize[zoom],
							center = map.options.crs.pointToLatLng(L.point(imageSize.x/2, imageSize.y/2), zoom);

						map.setView(center, zoom, true);
					},

					_getGridSize: function (imageSize) {
						var tileSize = this.options.tileSize;
						return L.point(Math.ceil(imageSize.x / tileSize), Math.ceil(imageSize.y / tileSize));
					},

					_getBestFitZoom: function (mapSize) {
						var tolerance = this.options.tolerance,
							zoom = this._imageSize.length - 1,
							imageSize, zoom;

						while (zoom) {
							imageSize = this._imageSize[zoom];
							if (imageSize.x * tolerance < mapSize.x && imageSize.y * tolerance < mapSize.y) {
								return zoom;
							}			
							zoom--;
						}

						return zoom;
					},

					_tileShouldBeLoaded: function (tilePoint) {
						var gridSize = this._gridSize[this._map.getZoom()];
						return (tilePoint.x >= 0 && tilePoint.x < gridSize.x && tilePoint.y >= 0 && tilePoint.y < gridSize.y);
					},

					_addTile: function (tilePoint, container) {
						var tilePos = this._getTilePos(tilePoint),
							tile = this._getTile(),
							zoom = this._map.getZoom(),
							imageSize = this._imageSize[zoom],
							gridSize = this._gridSize[zoom],
							tileSize = this.options.tileSize;

						if (tilePoint.x === gridSize.x - 1) {
							tile.style.width = imageSize.x - (tileSize * (gridSize.x - 1)) + 'px';
						} 

						if (tilePoint.y === gridSize.y - 1) {
							tile.style.height = imageSize.y - (tileSize * (gridSize.y - 1)) + 'px';			
						} 

						L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome || L.Browser.android23);

						this._tiles[tilePoint.x + ':' + tilePoint.y] = tile;
						this._loadTile(tile, tilePoint);

						if (tile.parentNode !== this._tileContainer) {
							container.appendChild(tile);
						}
					},
					getTileUrl: function (tilePoint) {
						return arachneSettings.dataserviceUri + '/image/zoomify/' + this._entityId + '/' + this._map.getZoom() + '-' + tilePoint.x + '-' + tilePoint.y + '.jpg';
					},

					_getTileGroup: function (tilePoint) {
						var zoom = this._map.getZoom(),
							num = 0,
							gridSize;

						for (var z = 0; z < zoom; z++) {
							gridSize = this._gridSize[z];
							num += gridSize.x * gridSize.y; 
						}	

						num += tilePoint.y * this._gridSize[zoom].x + tilePoint.x;
				      	return Math.floor(num / 256);
					}

				});

				L.tileLayer.zoomify = function (entityId, options) {
					return new L.TileLayer.Zoomify(entityId, options);
				};
				var map = L.map(element[0]).setView([0,0], 0);
				L.tileLayer.zoomify(attrs.entityid, {
		    		width: scope.imageProperties.width,
		    		height: scope.imageProperties.height,
		    		tileSize : scope.imageProperties.tilesize,
		    		tolerance: 0.8
				}).addTo(map);

	        }
    	};
	}]);
