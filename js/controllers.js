'use strict';

/* Controllers */

angular.module('arachne.controllers', ['ui.bootstrap'])
.controller('MenuCtrl',	[ '$scope', '$modal', 'authService', '$location', '$route',
	function ($scope,  $modal, authService, $location, $route) {

		$scope.user = authService.getUser();

		$scope.currentPath = $location.path();
		$scope.$on("$locationChangeSuccess", function() {			
			$scope.currentPath = $location.path();
		});

		$scope.openLoginModal = function() {
			var modalInstance = $modal.open({
				templateUrl: 'partials/Modals/loginForm.html',
				controller: 'LoginCtrl'
			});
			modalInstance.result.then(function(user) {
				$scope.user = user;
			});
		};

		$scope.logout = function() {
			authService.clearCredentials();
			$scope.user = authService.getUser();
			$route.reload();
		}

	}
])
.controller('LoginCtrl', ['$scope', '$modalInstance', 'authService', '$timeout', '$modal', '$route',
	function($scope, $modalInstance, authService, $timeout, $modal, $route){
		
		$scope.loginData = {};
		$scope.loginerror = false;

		$scope.login = function() {

			authService.setCredentials($scope.loginData.user, $scope.loginData.password, function(response) {
				$scope.loginerror = false;
				var closeModal = function () {
            		$modalInstance.close(authService.getUser());
            		$route.reload();
            	}
                $timeout(closeModal, 500);
			}, function(response) {
				$scope.loginerror = true;
			});

		};

		$scope.cancel = function () {
			$modalInstance.dismiss();
		};
	
	}
])
.controller('SearchFormCtrl', ['$scope', '$location',
	function($scope, $location) {

		$scope.search = function(fq) {
			if ($scope.q) {
				var url = '/search?q=' + $scope.q;
				if (fq) url += "&fq=" + fq;
				$scope.q = null;
				$location.url(url);
			}
		}

	}
])
.controller('SearchCtrl', ['$rootScope','$scope','searchService','categoryService', '$filter', 'arachneSettings', '$location', 'messageService', '$http',
	function($rootScope,$scope, searchService, categoryService, $filter, arachneSettings, $location, messageService, $http){

		$rootScope.hideFooter = false;
		
		$scope.currentQuery = searchService.currentQuery();
		$scope.q = angular.copy($scope.currentQuery.q);

		$scope.sortableFields = arachneSettings.sortableFields;
		// ignore unknown sort fields
		if (arachneSettings.sortableFields.indexOf($scope.currentQuery.sort) == -1) {
			delete $scope.currentQuery.sort;
		}

		categoryService.getCategoriesAsync().then(function(categories) {
			$scope.categories = categories;
		});
	
		searchService.getCurrentPage().then(function(entities) {
			$scope.entities = entities;
			$scope.resultSize = searchService.getSize();
			$scope.totalPages = Math.ceil($scope.resultSize / $scope.currentQuery.limit);
			$scope.currentPage = $scope.currentQuery.offset / $scope.currentQuery.limit + 1;
			$scope.facets = searchService.getFacets();
			$scope.facets.forEach(function(facet) {
				facet.open = false;
				arachneSettings.openFacets.forEach(function(openName) {
					if (facet.name.slice(0, openName.length) == openName)
						facet.open = true;
				});
			});
			$scope.cells = $filter('cellsFromEntities')(entities,$scope.currentQuery);
		}, function(response) {
			$scope.resultSize = 0;
			$scope.error = true;
			if (response.status == '404') messageService.addMessageForCode('backend_missing');
			else messageService.addMessageForCode('search_' +  response.status);
		});

		$scope.go = function(path) {
			$location.url(path);
		};

		$scope.previousPage = function() {
			if ($scope.currentPage > 1)
				$scope.currentPage -= 1;
			$scope.onSelectPage();
		};

		$scope.nextPage = function() {
			if ($scope.currentPage < $scope.totalPages)
				$scope.currentPage += 1;
			$scope.onSelectPage();
		};

		$scope.onSelectPage = function() {
			var newOffset = ($scope.currentPage-1) * $scope.currentQuery.limit;
			$location.url('search/' + $scope.currentQuery.setParam('offset', newOffset).toString());
		};

	}
])
.controller('CategoryCtrl', ['$rootScope','$scope', 'Query', 'categoryService', '$location', 'Entity',
	function($rootScope, $scope, Query, categoryService, $location, Entity) {

		$rootScope.hideFooter = false;

		$scope.category = $location.search().c;

		categoryService.getCategoriesAsync().then(function(categories) {
			$scope.title = categories[$scope.category].title;
			$scope.imgUri = categories[$scope.category].imgUri;
			$scope.subtitle = categories[$scope.category].subtitle;
			$scope.mapfacet = categories[$scope.category].geoFacet;
		});

		$scope.currentQuery = new Query().addFacet("facet_kategorie", $scope.category);
		$scope.currentQuery.q = "*";

		Entity.query($scope.currentQuery.toFlatObject(), function(response) {
			$scope.facets = response.facets;
			$scope.resultSize = response.size;
		});

	}
])
.controller('MapCtrl', ['$rootScope', '$scope', 'searchService', 'categoryService', '$location',
	function($rootScope, $scope, searchService, categoryService, $location) {

		$scope.mapfacetNames = ["facet_aufbewahrungsort", "facet_fundort", "facet_geo"]; //, "facet_ort"

		$rootScope.hideFooter = true;

		$scope.currentQuery = searchService.currentQuery();
		$scope.currentQuery.limit = 0;
		if (!$scope.currentQuery.restrict) {
			$scope.currentQuery.restrict = $scope.mapfacetNames[0];
		}
		$scope.facetLimit = $scope.currentQuery.fl;
		$scope.q = angular.copy($scope.currentQuery.q);
	
		searchService.getCurrentPage().then(function(entities) {
			$scope.resultSize = searchService.getSize();
			$scope.facets = searchService.getFacets();
			for (var i = 0; i < $scope.facets.length; i++) {
				if ($scope.facets[i].name == $scope.currentQuery.restrict) {
					$scope.mapfacet = $scope.facets[i];
					break;
				}
			}
		}, function(response) {
			$scope.resultSize = 0;
			$scope.error = true;
			if (response.status == '404') messageService.addMessageForCode('backend_missing');
			else messageService.addMessageForCode('search_' +  response.status);
		});

		$scope.switchMapFacet = function(facetName) {
			$scope.go("map/" + $scope.currentQuery.setParam("restrict", facetName).toString());
		};

		$scope.go = function(path) {
			$location.url(path);
		};

	}
])
.controller('EntityCtrl', ['$rootScope', '$routeParams', 'searchService', '$scope', '$modal', 'Entity', '$location','arachneSettings', 'catalogService', 'authService', 'categoryService', 'Query', 'messageService',
	function ($rootScope, $routeParams, searchService, $scope, $modal, Entity, $location, arachneSettings, catalogService, authService, categoryService, Query, messageService) {

		$rootScope.hideFooter = false;
		
		$scope.user = authService.getUser();
		$scope.serverUri = arachneSettings.serverUri;

		categoryService.getCategoriesAsync().then(function(categories) {
			$scope.categories = categories;
		});

		$scope.currentQuery = searchService.currentQuery();

		$scope.go = function(path) {
			$location.url(path);
		};

		$scope.catalogs = [];
		$scope.catalogs = catalogService.getCatalogs();

		$scope.createEntry = function(){
			$scope.catalogs = catalogService.getCatalogs();
			catalogService.createEntry($routeParams.id, $scope.catalogs, $scope.entity.title, function(data){
			});			
		}

		// TODO Abstract Sections-Template and Logic to seperate unit - for reuse 
		// LOGIC for sections-iteration
		$scope.isArray = function(value) {
			if(angular.isArray(value)) {
				if(value.length == 1) return false;
				return true;
			}
			return false;
		}

		// if no id given, but query get id from search and reload
		if (!$routeParams.id && $scope.currentQuery.hasOwnProperty('resultIndex')) {

			var resultIndex = parseInt($scope.currentQuery.resultIndex);
			searchService.getEntity(resultIndex).then(function(entity) {
				$location.url('entity/' + entity.entityId + $scope.currentQuery.toString());
				$location.replace();
			});

		} else {
			
			Entity.get({id:$routeParams.id}, function(data) {
				$scope.entity = data;
				document.title = $scope.entity.title + " | Arachne";
			}, function(response) {
				$scope.error = true;
				messageService.addMessageForCode("entity_"+response.status);
			});
				
			$scope.contextQuery = new Query();
			$scope.contextQuery.label = "Mit " + $routeParams.id + " verknüpfte Objekte";
			$scope.contextQuery.q = "connectedEntities:" + $routeParams.id;
			$scope.contextQuery.limit = 0;

			if ($scope.currentQuery.hasOwnProperty('resultIndex')) {
				
				$scope.resultIndex = parseInt($scope.currentQuery.resultIndex);
				$scope.resultIndexInput = $scope.resultIndex;
				searchService.getCurrentPage().then(function(results) {
					$scope.searchresults = results;
					$scope.resultSize = searchService.getSize();
				}, function(response) {
					$scope.searchresults = {size: 0};
					messageService.addMessageForCode('search_' + response.status);
				});

				var prevIndex = $scope.resultIndex-1;
				$scope.prevEntity = searchService.getEntity(prevIndex).then(function(entity) {
					$scope.prevEntity = entity;
				}, function() { $scope.prevEntity = false; });
				var nextIndex = $scope.resultIndex+1;
				$scope.nextEntity = searchService.getEntity(nextIndex).then(function(entity) {
					$scope.nextEntity = entity;
				}, function() { $scope.prevEntity = false; });

			}
		}

	}
])
.controller('CatalogController',['$rootScope', '$scope', '$modal', 'authService', 'catalogService','arachneSettings', 'Query', 'Entity', '$filter',
	function ($rootScope, $scope, $modal, authService, catalogService, arachneSettings, Query, Entity, $filter) {

		$rootScope.hideFooter = false;

		$scope.catalogs = [];
		$scope.user = authService.getUser();
		$scope.dataserviceUri = arachneSettings.dataserviceUri;

		$scope.refreshCatalogs = function(){
			$scope.catalogs = catalogService.getCatalogs();
		}

		$scope.refreshCatalogs();
		
		$scope.createEntry = function(){
			var label;
			var createEntryId = $modal.open({
				templateUrl: 'partials/Modals/createEntryId.html'
			});	

			createEntryId.close = function(arachneId){

				Entity.get({id:arachneId}, function(data) {
					$scope.entity = data;
					label = $scope.entity.title;
					createEntryId.dismiss();
					catalogService.createEntry(arachneId, $scope.catalogs, label, function(data){ 
						$scope.refreshCatalogs();
					});

				}, function(response) {
					console.log("error get Entity");
					alert("Falsche Id!");	
				});
			}
		}
		$scope.deleteEntry = function(entry){
			catalogService.deleteEntry(entry.id,
				function(data){
					$scope.refreshCatalogs();
				});
		}

		$scope.updateEntry = function(entry){
			catalogService.updateEntry(entry, function(data){
				$scope.refreshCatalogs();
			});
		}

		$scope.updateCatalog = function(CatalogId){
			var Catalog;
			catalogService.getCatalog(CatalogId, function(data){
				Catalog = data;
				catalogService.updateCatalog(Catalog, function(data){
					$scope.refreshCatalogs();
				});
			});
		}

		$scope.createCatalog = function(){
			catalogService.createCatalog(function(response){
				$scope.catalogs.push(response);
			});
		}

		$scope.deleteCatalog = function(CatalogId){
			catalogService.deleteCatalog(CatalogId,
				function(data){
					// console.log("deleted List" + data);
					$scope.refreshCatalogs();
				});
		}

	}
])
.controller('EntityImageCtrl', ['$routeParams', '$scope', '$modal', 'Entity', 'authService', 'searchService', '$location','arachneSettings', '$http', '$window', '$rootScope', 'messageService',
	function($routeParams, $scope, $modal, Entity, authService, searchService, $location, arachneSettings, $http, $window, $rootScope, messageService) {

		$rootScope.hideFooter = true;
		$scope.allow = true;

		$scope.refreshImageIndex = function() {
			if($scope.entity && $scope.entity.images) {
				for (var i = 0; i < $scope.entity.images.length; i++) {
					if ($scope.entity.images[i].imageId == $scope.imageId) {
						$scope.imageIndex = i;
						break;
					}
				}
			}
		};

		$scope.requestFullscreen = function() {
			var element = document.getElementById('theimage');
			// Find the right method, call on correct element			
			if(element.requestFullscreen) {
			    element.requestFullscreen();
			} else if(element.mozRequestFullScreen) {
			    element.mozRequestFullScreen();
			} else if(element.webkitRequestFullscreen) {
			    element.webkitRequestFullscreen();
			} else if(element.msRequestFullscreen) {
			    element.msRequestFullscreen();
			}
		};

		$scope.downloadImage = function() {
			var imgUri = arachneSettings.dataserviceUri + "/image/" + $scope.imageId;
			var entityUri = arachneSettings.dataserviceUri + "/entity/" + $scope.imageId;
			$http.get(imgUri, { responseType: 'blob' }).success(function(data) {
				var document = $window.document;
				var a = document.createElement('a');
				document.body.appendChild(a);
				a.style = "display:none";
				var blob = new Blob([data], {type: 'image/jpeg'});
				var blobUri = $window.URL.createObjectURL(blob);
				a.href = blobUri;
				$http.get(entityUri).success(function(data) {
					a.download = data.title;
					a.click();
				});
			});
		}

		$scope.user = authService.getUser();
		$scope.currentQuery = searchService.currentQuery();
		$scope.entityId = $routeParams.entityId;
		$scope.imageId = $routeParams.imageId;
		Entity.get({id:$routeParams.entityId}, function(data) {
			$scope.entity = data;
			$scope.refreshImageIndex();
		}, function(response) {
			messageService.addMessageForCode("entity_"+response.status);
		});
		Entity.imageProperties({id: $scope.imageId}, function(data) {
			$scope.imageProperties = data;
			$scope.allow = true;
		}, function(response) {
			if (response.status == '403') {
				$scope.allow = false;
			} else {
				messageService.addMessageForCode('image_' + response.status);
			}
		});

		$scope.$watch("imageId", function() {
			$scope.refreshImageIndex();
		});

	}
])
.controller('EntityImagesCtrl', ['$routeParams', '$scope', 'Entity', '$filter', 'searchService', '$rootScope', 'messageService',
	function($routeParams, $scope, Entity, $filter, searchService, $rootScope, messageService) {

		$rootScope.hideFooter = true;

		$scope.currentQuery = searchService.currentQuery();
		$scope.entityId = $routeParams.entityId;
		$scope.imageId = $routeParams.imageId;
		Entity.get({id:$routeParams.entityId}, function(data) {
			// call to filter detached from view in order to prevent unnecessary calls
			$scope.entity = data;
			$scope.cells = $filter('cellsFromImages')(data.images, data.entityId, $scope.currentQuery);
		}, function(response) {
			messageService.addMessageForCode("entity_"+response.status);
		});

	}
])
.controller('StartSiteController', ['$rootScope', '$scope', '$http', 'arachneSettings', 'messageService', 'categoryService', '$timeout',
	function ($rootScope, $scope, $http, arachneSettings, messageService, categoryService, $timeout) {

		$rootScope.hideFooter = false;

        categoryService.getCategoriesAsync().then(function(categories) {
			$scope.categories = [];
			for(var key in categories) {
				if (categories[key].status == 'start') {
					$scope.categories.push(categories[key]);
				}
			}
		});
		
		$http.get(arachneSettings.dataserviceUri + "/entity/count").success(function(data) {
			$scope.entityCount = data.entityCount;
		}).error(function(data) {
			messageService.addMessageForCode("backend_missing");
		});

	}
])
.controller('AllCategoriesController', ['$rootScope', '$scope', '$http', 'categoryService', '$timeout',
	function ($rootScope, $scope, $http, categoryService, $timeout) {

		$rootScope.hideFooter = false;

		categoryService.getCategoriesAsync().then(function(categories) {
			$scope.categories = [];
			for(var key in categories) {
				if (categories[key].status != 'none') {
					$scope.categories.push(categories[key]);
				}
			}
		});

	}
])
.controller('ThreeDimensionalController', ['$scope', '$location', '$http', '$modal', 'arachneSettings', '$rootScope',
	function ($scope, $location, $http, $modal, arachneSettings, $rootScope) {

		$rootScope.hideFooter = true;
		
		this.showInfo = function () {
		
			if(!$scope.metainfos) {
				$http.get(arachneSettings.dataserviceUri + "/model/" + $location.search().id + "?meta=true" ).success (function(data){
					$scope.metainfos = data;
				});
			}

			var modalInstance = $modal.open({
				templateUrl: 'partials/Modals/3dInfoModal.html',
				scope: $scope
			});
			
			modalInstance.close = function(){
				modalInstance.dismiss();
			}
		
		}
	}
])
.controller('RegisterCtrl', ['$rootScope', '$scope', '$http', '$filter', 'arachneSettings',
	function ($rootScope, $scope, $http, $filter, arachneSettings) {

		$rootScope.hideFooter = false;

		$scope.user = {};
		$scope.success = false;
		$scope.error = "";

		$scope.submit = function() {
			if ($scope.password && $scope.passwordValidation) {
				$scope.user.password = $filter('md5')($scope.password);
				$scope.user.passwordValidation = $filter('md5')($scope.passwordValidation);
			}
			$http.post(arachneSettings.dataserviceUri + "/user/register", $scope.user, {
				"headers": { "Content-Type": "application/json" }
			}).success(function(data) {
				$scope.error = "";
				$scope.success = true;
			}).error(function(data) {
				$scope.error = data.message;
			});
		}

	}
])
.controller('MessageCtrl', ['$scope', 'messageService',
	function ($scope, messageService) {

		$scope.messages = messageService.getMessages();

		$scope.removeMessage = function(index) {
			messageService.removeMessage(index);
		}

	}
]);
