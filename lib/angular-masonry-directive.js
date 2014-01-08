(function() {
    "use strict";

    angular.module('masonry', ['ng']).directive('masonry', function($parse) {
        return {
            restrict: 'AC',
            link: function(scope, elem, attrs) {
                scope.items = [];
                var container = elem[0];
                var options = angular.extend({
                    itemSelector: '.item'
                }, JSON.parse(attrs.masonry));

                scope.obj = new Masonry(container, options);
                scope.$watch('search.entities', function () {
                    imagesLoaded( container, function() {

                        scope.obj.layout();
                    });            
                });

                        
            }
        };
    }).directive('masonryTile', function() {
        return {
            restrict: 'AC',
            link: function(scope, elem) {
                var master = elem.parent('*[mansory]:first').scope();
                var mansory = master.obj;

                elem.ready(function() {
                    mansory.addItems([elem]);
                    mansory.reloadItems();
                    mansory.layout();
                });


                

                
            }
        };
    });
})();
