(function() {
'use strict';

describe('', function () {
    var ENTER = 13, TAB = 9, BACKSPACE = 8, ESCAPE = 27, DOWN_ARROW = 40, UP_ARROW = 38;

    var $compile, $scope, $q,
        parentCtrl, element, input, changeHandler, deferred;

    beforeEach(function () {
        module('tags-input');

        inject(function($rootScope, _$compile_, _$q_) {
            $scope = $rootScope;
            $compile = _$compile_;
            $q = _$q_;
        });

        deferred = $q.defer();
        $scope.loadItems = jasmine.createSpy().andReturn(deferred.promise);

        compile();
    });

    function compile() {
        input = angular.element('<input type="text">');
        input.changeValue = jasmine.createSpy();
        input.change = jasmine.createSpy().andCallFake(function(handler) { changeHandler = handler; });

        var parent = $compile('<tags-input ng-model="whatever"></tags-input>')($scope);
        parentCtrl = parent.controller('tagsInput');

        spyOn(parentCtrl, 'getInputWrapper').andReturn(input);

        element = angular.element('<autocomplete source="loadItems"></autocomplete>');
        parent.append(element);

        $compile(element)($scope);
        $scope.$digest();
    }

    function resolve(items) {
        deferred.resolve(items);
        $scope.$digest();
    }

    function sendKeyDown(keyCode) {
        var event = jQuery.Event('keydown', { keyCode: keyCode });
        input.trigger(event);

        return event;
    }

    function changeInputValue(value) {
        changeHandler(value);
        $scope.$digest();
    }

    function getSuggestionsBox() {
        return element.find('div');
    }

    function getSuggestions() {
        return getSuggestionsBox().find('li');
    }

    function getSuggestion(index) {
        return getSuggestions().eq(index);
    }

    function getSuggestionText(index) {
        return getSuggestion(index).html();
    }

    function loadSuggestions(items) {
        element.scope().suggestions.load('');
        resolve(items);
    }

    describe('basic features', function() {
        it('ensures that the suggestions list is hidden by default', function() {
            expect(getSuggestionsBox().css('display')).toBe('none');
        });

        it('renders all elements returned by the load function', function() {
            // Act
            loadSuggestions(['Item1','Item2','Item3']);

            // Assert
            expect(getSuggestions().length).toBe(3);
            expect(getSuggestionText(0)).toBe('Item1');
            expect(getSuggestionText(1)).toBe('Item2');
            expect(getSuggestionText(2)).toBe('Item3');
        });

        it('shows the suggestions list when there are items to show', function() {
            // Act
            loadSuggestions(['Item1']);

            // Assert
            expect(getSuggestionsBox().css('display')).toBe('');
        });

        it('hides the suggestions list when there is no items to show', function() {
            // Act
            loadSuggestions([]);

            // Assert
            expect(getSuggestionsBox().css('display')).toBe('none');
        });

        it('hides the suggestion box when the input field becomes empty', function() {
            // Arrange
            changeInputValue('foobar');
            element.scope().suggestions.show();
            $scope.$digest();

            // Act
            changeInputValue('');

            // Assert
            expect(getSuggestionsBox().css('display')).toBe('none');
        });

        it('hides the suggestion box when the escape key is pressed', function() {
            // Arrange
            element.scope().suggestions.show();
            $scope.$digest();

            // Act
            sendKeyDown(ESCAPE);

            // Assert
            expect(getSuggestionsBox().css('display')).toBe('none');
        });

        it('hides the suggestion box when the user clicks elsewhere on the page', function() {
            // Arrange
            element.scope().suggestions.show();
            $scope.$digest();

            // Act
            $(document).trigger('click');

            // Assert
            expect(getSuggestionsBox().css('display')).toBe('none');
        });

        it('adds the selected suggestion to the input field when the enter key is pressed and the suggestions box is visible', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            element.scope().suggestions.show();
            element.scope().selectSuggestion(0);

            // Act
            sendKeyDown(ENTER);

            // Assert
            expect(input.changeValue).toHaveBeenCalledWith('Item1');
        });

        it('adds the selected suggestion to the input field when the tab key is pressed and there is a suggestion selected', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            element.scope().suggestions.show();
            element.scope().selectSuggestion(0);

            // Act
            sendKeyDown(TAB);

            // Assert
            expect(input.changeValue).toHaveBeenCalledWith('Item1');
        });

        it('does not change the input value when the enter key is pressed and there is nothing selected', function () {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            element.scope().suggestions.show();

            // Act
            sendKeyDown(ENTER);

            // Assert
            expect(input.changeValue).not.toHaveBeenCalled();
        });

        it('sets the selected suggestion to null after adding it to the input field', function () {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            element.scope().selectSuggestion(0);

            // Act
            element.scope().addSuggestion();

            // Assert
            expect(element.scope().suggestions.selected).toBeNull();
        });

        it('hides the suggestion box after adding the selected suggestion to the input field', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            element.scope().suggestions.show();
            element.scope().selectSuggestion(0);

            // Act
            sendKeyDown(ENTER);

            // Assert
            expect(getSuggestionsBox().css('display')).toBe('none');
        });

        it('calls the load function for every key pressed passing the input content', function() {
            // Act
            changeInputValue('A');
            changeInputValue('AB');
            changeInputValue('ABC');

            // Assert
            expect($scope.loadItems.callCount).toBe(3);
            expect($scope.loadItems.calls[0].args[0]).toBe('A');
            expect($scope.loadItems.calls[1].args[0]).toBe('AB');
            expect($scope.loadItems.calls[2].args[0]).toBe('ABC');
        });

        it('does not call the load function after adding the selected suggestion to the input field', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            element.scope().suggestions.show();
            element.scope().selectSuggestion(0);

            // Act
            sendKeyDown(ENTER);

            // Assert
            expect($scope.loadItems.callCount).toBe(1);
        });

        it('calls the load function passing the current input content when the down arrow key is pressed and the suggestions box is hidden', function() {
            // Act
            sendKeyDown(DOWN_ARROW);

            // Assert
            expect($scope.loadItems).toHaveBeenCalledWith('');
        });

        it('highlights the selected suggestion only', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2', 'Item3']);

            // Act
            element.scope().selectSuggestion(1);
            $scope.$digest();

            // Assert
            expect(getSuggestion(0).hasClass('selected')).toBe(false);
            expect(getSuggestion(1).hasClass('selected')).toBe(true);
            expect(getSuggestion(2).hasClass('selected')).toBe(false);
        });

        it('selects no suggestion after the suggestion box is shown', function () {
            // Arrange/Act
            loadSuggestions(['Item1', 'Item2']);

            // Assert
            expect(element.scope().suggestions.selected).toBeNull();
        });
    });

    describe('navigation through suggestions', function() {
        beforeEach(function() {
            element.scope().suggestions.show();
        });

        describe('downward', function() {
            it('selects the next suggestion when the down arrow key is pressed and there\'s something selected', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2']);
                element.scope().selectSuggestion(0);

                // Act
                sendKeyDown(DOWN_ARROW);

                // Assert
                expect(element.scope().suggestions.selected).toBe('Item2');
            });

            it('selects the first suggestion when the down arrow key is pressed and the last item is selected', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2']);
                element.scope().selectSuggestion(1);

                // Act
                sendKeyDown(DOWN_ARROW);

                // Assert
                expect(element.scope().suggestions.selected).toBe('Item1');
            });
        });

        describe('upward', function() {
            it('selects the prior suggestion when the down up key is pressed and there\'s something selected', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2']);
                element.scope().selectSuggestion(1);

                // Act
                sendKeyDown(UP_ARROW);

                // Assert
                expect(element.scope().suggestions.selected).toBe('Item1');
            });

            it('selects the last suggestion when the up arrow key is pressed and the first item is selected', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2']);
                element.scope().selectSuggestion(0);

                // Act
                sendKeyDown(UP_ARROW);

                // Assert
                expect(element.scope().suggestions.selected).toBe('Item2');
            });
        });

        describe('mouse', function() {
            it('selects the suggestion under the mouse pointer', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2', 'Item3']);

                // Act
                getSuggestion(1).mouseenter();

                // Assert
                expect(element.scope().suggestions.selected).toBe('Item2');
            });

            it('adds the selected suggestion to the input field when a mouse click is triggered', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2', 'Item3']);
                getSuggestion(1).mouseenter();

                // Act
                getSuggestion(1).click();

                // Assert
                expect(input.changeValue).toHaveBeenCalledWith('Item2');
            });

            it('focuses the input field when a suggestion is added via a mouse click', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2', 'Item3']);
                spyOn(input[0], 'focus');

                // Act
                getSuggestion(1).click();

                // Assert
                expect(input[0].focus).toHaveBeenCalled();
            });
        });
    });

    describe('hotkeys propagation handling - suggestion box is visible', function () {
        beforeEach(function () {
            element.scope().suggestions.show();
        });

        it('prevents the down arrow keydown event from being propagated', function () {
            expect(sendKeyDown(DOWN_ARROW).isDefaultPrevented()).toBe(true);
        });

        it('prevents the up arrow keydown event from being propagated', function () {
            expect(sendKeyDown(UP_ARROW).isDefaultPrevented()).toBe(true);
        });

        it('prevents the enter keydown event from being propagated', function () {
            expect(sendKeyDown(ENTER).isDefaultPrevented()).toBe(true);
        });

        it('prevents the tab keydown event from being propagated', function () {
            expect(sendKeyDown(TAB).isDefaultPrevented()).toBe(true);
        });

        it('prevents the escape keydown event from being propagated', function () {
            expect(sendKeyDown(ESCAPE).isDefaultPrevented()).toBe(true);
        });
    });

    describe('hotkeys propagation handling - suggestion box is hidden', function () {
        beforeEach(function () {
            element.scope().suggestions.reset();
        });

        it('prevents the down arrow keydown event from being propagated', function () {
            expect(sendKeyDown(DOWN_ARROW).isDefaultPrevented()).toBe(true);
        });

        it('does not prevent the up arrow keydown event from being propagated', function () {
            expect(sendKeyDown(UP_ARROW).isDefaultPrevented()).toBe(false);
        });

        it('does not prevent the enter keydown event from being propagated', function () {
            expect(sendKeyDown(ENTER).isDefaultPrevented()).toBe(false);
        });

        it('does not prevent the tab keydown event from being propagated', function () {
            expect(sendKeyDown(TAB).isDefaultPrevented()).toBe(false);
        });

        it('does not prevent the escape keydown event from being propagated', function () {
            expect(sendKeyDown(ESCAPE).isDefaultPrevented()).toBe(false);
        });
    });
});

})();
