'use strict';

/* Services */

angular.module('arachne.services', [])
	.factory('arachneSearch', 
		['$resource','$location',
			function($resource, $location) {

			//PRIVATE
		        function parseUrlFQ (fqParam) {
		        	if(!fqParam) return;
					var facets = [];
					fqParam = fqParam.split(/\"\,/);
					for (var i = fqParam.length - 1; i >= 0; i--) {
						var facetNameAndVal = fqParam[i].replace(/"/g,'').split(':');

						facets.push({
							name: facetNameAndVal[0],
							value: facetNameAndVal[1]
						});
					};
					return facets;
				};

		        var arachneDataService = $resource('http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/search', {}, {query: {
		            isArray: false,
		            method: 'GET',
		            headers: {'Content-Type': 'application/json'}
		        }});

		        var _activeFacets = [];
		        var _currentQueryParameters =  {};

		      	
		     //PUBLIC
		        return {
		        	activeFacets : _activeFacets,

		        	executeSearch : function (queryParams) {
		        		if (queryParams) {
		        			angular.copy(queryParams,_currentQueryParameters);
		        		} else {
		        			angular.copy(parseUrlFQ($location.$$search.fq), _activeFacets );
		        			angular.copy( $location.$$search, _currentQueryParameters );
		        		}
			            return arachneDataService.query( _currentQueryParameters);
			        },

			        addFacet : function (facetName, facetValue) {
			        	//Check if facet is already included
						for (var i = _activeFacets.length - 1; i >= 0; i--) {
							if (_activeFacets[i].name == facetName) return;
						};

						var hash = $location.$$search;

						if (hash.fq) {
							hash.fq += "," + facetName + ':"' + facetValue + '"';
						} else {
							hash.fq = facetName + ':"' + facetValue + '"';
						}

						$location.search(hash);
		        	},

		        	removeFacet : function (facet) {
		        		for (var i = _activeFacets.length - 1; i >= 0; i--) {
							if (_activeFacets[i].name == facet.name) {
								_activeFacets.splice(i,1);
							}
						};
						
						var facets = _activeFacets.map(function(facet){
							return facet.name + ':"' + facet.value + '"';
						}).join(",");

						var hash = $location.$$search;
						hash.fq = facets;

						$location.search(hash);
		        	},

		        	getMarkers : function(queryParams){
		        		if (queryParams) {
		        			angular.copy(queryParams,_currentQueryParameters);
		        		} else {
		        			angular.copy(parseUrlFQ($location.$$search.fq), _activeFacets );
		        			angular.copy( $location.$$search, _currentQueryParameters );
		        		}
			            return arachneDataService.query(_currentQueryParameters, function (data) {
			            	data.markers = new L.MarkerClusterGroup();

							// title += value.link + "'>Objekte zu diesem Ort anzeigen</a>"
							// title = title.replace('#simpleBrowsing', '#search')

			            	for(var entry in data.facets.facet_geo)
			            	{
			            		var coordsString = entry.substring(entry.indexOf("[", 1)+1, entry.length - 1);
								var coords = coordsString.split(',');
								var title = entry.substring(0, entry.indexOf("[", 1)-1);
								//console.log(value.link);

								var marker = L.marker(new L.LatLng(coords[0], coords[1]), { title: title });
								marker.bindPopup(title);
								data.markers.addLayer(marker);
			            	} 
			            	return data 
	            		});
			        }
		        }

			
		}])

	.factory('arachneEntity',
		['$resource',
			function($resource){
				return $resource('http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/entity/:id'
				);
			}
		]
	)
	.factory('arachneEntityImg',
		['$resource',
			function($resource){
				return $resource('http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/image/:id'
				);
			}
		]
	)
	.factory('sessionService', function($http, $cookieStore){
		
		var currentUser = $cookieStore.get('user') || {};
		function changeUser (userFromServer) {
	       	angular.extend(currentUser, {
	       		username : userFromServer.userAdministration.username,
	       		lastname : userFromServer.userAdministration.lastname,
	       		firstname: userFromServer.userAdministration.firstname
	       	});
	       	$cookieStore.put('user',currentUser);
	    };

		return {
			user : currentUser,

			
			login : function(loginData, success, error) {
				$http({
					url : 'http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/sessions',
		            isArray: false,
		            method: 'POST',
		            data : loginData,
		            headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
		            transformRequest: function(obj) {
				        var str = [];
				        for(var p in obj)
				        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				        return str.join("&");
				    },

		        }).success(function (user) {
				    	changeUser(user);
				    	success(user);
				}).error(error);
			}
		}
	})
	.factory('newsFactory', function($http){
		var factory = {};
		factory.getNews = function() {
				return $http.get('http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/news/de');
			};
		return factory;
	})
	.factory('teaserFactory', function($http){
		var factory = {};
		factory.getTeaser = function() {
				return $http.get('http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/teasers/de');
			};
		return factory;
	})
	.factory('bookmarksFactory', function($http){
		var factory = {};
		var bookmarkslist = {};
		var bookmark = {};

		factory.checkEntity  = function(entityID, successMethod, errorMethod){
			var response = [];
			factory.getBookmarksList(
				function(data){
					response = data;
					var entityBookmark = [];
					console.log("bookmark entity");

					for(var x in response){
					//console.log(response[x].name);
						for(var y in response[x].bookmarks){
							//console.log(bookmark);
							if(response[x].bookmarks[y].arachneEntityId == entityID)
							{
								entityBookmark = response[x].bookmarks[y];
							}
						}
					}

					successMethod(entityBookmark);
				}, function(status){
					if(status == 404)
						console.log("keine BookmarksListe enthalten");
					else if(status == 403)
						console.log("bitte einloggen");
					else
						console.log("unknown error");

					errorMethod("error");

				});			
			
			//console.log("NICHT VORHANDEN!");
		};

		factory.getBookmarksList = function(successMethod, errorMethod){
				return $http.get('http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/bookmarklist')
				.success(function(data) {
					bookmarkslist = data;
					successMethod(data);
				}).error(function(data, status, header, config){
					errorMethod(status);
				});
			};

		factory.createBookmarksList = function(listData, successMethod, errorMethod) {
				$http({
					url : 'http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/bookmarklist',
		            isArray: false,
		            method: 'POST',
		            data : listData,
		           	headers: {'Content-Type': 'application/json'}
		        }).success(function(data) {
					bookmarkslist = data;
					successMethod(data);
				}).error(function(data, status, header, config){
					errorMethod(status);
				});
			};

		factory.deleteBookmarksList = function(id, successMethod, errorMethod){
				var q = 'http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/bookmarklist/' + id;
				console.log(q);
				$http.delete(q)
				.success(function(data) {
					bookmarkslist = data;
					successMethod(data);
				}).error(function(data, status, header, config){
					errorMethod(status);
				});
			};
		factory.getBookmark = function(id, successMethod, errorMethod){
					$http.get('http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/bookmark/' + id)
					.success(function(data) {
						bookmark = data;
						successMethod(data);
					}).error(function(data, status, header, config){
						errorMethod(status);
					});
			};
		factory.createBookmark = function(bm, id, successMethod, errorMethod) {
				var q = 'http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/bookmarkList/' + id + '/add';
				console.log(q);
				$http({
					url : q,
		            isArray: false,
		            method: 'POST',
		            data : bm,
		           	headers: {'Content-Type': 'application/json'}
		        }).success(function(data) {
					//bookmarkslist = data;
					successMethod(data);
				}).error(function(data, status, header, config){
					errorMethod(status);
				});
			};
		factory.deleteBookmark = function(id, successMethod, errorMethod){
				var q = 'http://crazyhorse.archaeologie.uni-koeln.de/arachnedataservice/bookmark/' + id;
				console.log(q);
				$http.delete(q)
				.success(function(data) {
					bookmark = data;
					successMethod(data);
				}).error(function(data, status, header, config){
					errorMethod(status);
				});
			};
		return factory;
	});

