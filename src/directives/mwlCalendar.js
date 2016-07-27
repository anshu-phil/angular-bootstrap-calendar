'use strict';

var angular = require('angular');
var LOG_PREFIX = 'Bootstrap calendar:';
var CHANGELOG_LINK = 'https://github.com/mattlewis92/angular-bootstrap-calendar/blob/master/CHANGELOG.md';

angular
  .module('mwl.calendar')
  .controller('MwlCalendarCtrl', function($scope, $log, $timeout, $attrs, $locale, moment, calendarTitle, calendarHelper) {

    var vm = this;

    vm.events = vm.events || [];

    vm.changeView = function(view, newDay) {
      vm.view = view;
      vm.viewDate = newDay;
    };

    vm.dateClicked = function(date) {

      var rawDate = moment(date).toDate();

      var nextView = {
        year: 'month',
        month: 'day',
        week: 'day'
      };

      if (vm.onViewChangeClick({calendarDate: rawDate, calendarNextView: nextView[vm.view]}) !== false) {
        vm.changeView(nextView[vm.view], rawDate);
      }

    };

    if ($attrs.onEditEventClick || $attrs.onDeleteEventClick || $attrs.editEventHtml || $attrs.deleteEventHtml) {
      $log.warn(LOG_PREFIX, '`on-edit-event-click`, `on-delete-event-click`, `edit-event-html`, `delete-event-html` options ' +
        'are deprecated, please see the changelog on how to upgrade: ' + CHANGELOG_LINK);
    }

    var previousDate = moment(vm.viewDate);
    var previousView = vm.view;

    function eventIsValid(event) {
      if (!event.startsAt) {
        $log.warn(LOG_PREFIX, 'Event is missing the startsAt field', event);
      } else if (!angular.isDate(event.startsAt)) {
        $log.warn(LOG_PREFIX, 'Event startsAt should be a javascript date object. Do `new Date(event.startsAt)` to fix it.', event);
      }

      if (event.endsAt) {
        if (!angular.isDate(event.endsAt)) {
          $log.warn(LOG_PREFIX, 'Event endsAt should be a javascript date object. Do `new Date(event.endsAt)` to fix it.', event);
        }
        if (moment(event.startsAt).isAfter(moment(event.endsAt))) {
          $log.warn(LOG_PREFIX, 'Event cannot start after it finishes', event);
        }
      }

      if (event.type && !event.color) {
        $log.warn(LOG_PREFIX, 'Event type is deprecated, please see the changelog on how to upgrade: ' + CHANGELOG_LINK, event);
      }

      return true;
    }

    function refreshCalendar() {

      if (calendarTitle[vm.view] && angular.isDefined($attrs.viewTitle)) {
        vm.viewTitle = calendarTitle[vm.view](vm.viewDate);
      }

      vm.events = vm.events.filter(eventIsValid).map(function(event, index) {
        Object.defineProperty(event, '$id', {enumerable: false, configurable: true, value: index});
        return event;
      });

      //if on-timespan-click="calendarDay = calendarDate" is set then don't update the view as nothing needs to change
      var currentDate = moment(vm.viewDate);
      var shouldUpdate = true;
      if (
        previousDate.clone().startOf(vm.view).isSame(currentDate.clone().startOf(vm.view)) &&
        !previousDate.isSame(currentDate) &&
        vm.view === previousView
      ) {
        shouldUpdate = false;
      }
      previousDate = currentDate;
      previousView = vm.view;

      if (shouldUpdate) {
        // a $timeout is required as $broadcast is synchronous so if a new events array is set the calendar won't update
        $timeout(function() {
          $scope.$broadcast('calendar.refreshView');
        });
      }
    }

    calendarHelper.loadTemplates().then(function() {
      vm.templatesLoaded = true;

      var eventsWatched = false;

      //Refresh the calendar when any of these variables change.
      $scope.$watchGroup([
        'vm.viewDate',
        'vm.view',
        'vm.cellIsOpen',
        function() {
          return moment.locale() + $locale.id; //Auto update the calendar when the locale changes
        }
      ], function() {
        if (!eventsWatched) {
          eventsWatched = true;
          //need to deep watch events hence why it isn't included in the watch group
          $scope.$watch('vm.events', refreshCalendar, true); //this will call refreshCalendar when the watcher starts (i.e. now)
        } else {
          refreshCalendar();
        }
      });

    }).catch(function(err) {
      $log.error('Could not load all calendar templates', err);
    });

  })
  .directive('mwlCalendar', function() {

    return {
      template: '<div mwl-dynamic-directive-template name="calendar" overrides="vm.customTemplateUrls"></div>',
      restrict: 'E',
      scope: {
        events: '=',
        view: '=',
        viewTitle: '=?',
        viewDate: '=',
        editEventHtml: '=?',
        deleteEventHtml: '=?',
        cellIsOpen: '=?',
        slideBoxDisabled: '=?',
        customTemplateUrls: '=?',
        onEventClick: '&',
        onEventTimesChanged: '&',
        onEditEventClick: '&',
        onDeleteEventClick: '&',
        onTimespanClick: '&',
        onDateRangeSelect: '&?',
        onViewChangeClick: '&',
        cellModifier: '&',
        dayViewStart: '@',
        dayViewEnd: '@',
        dayViewSplit: '@',
        dayViewEventChunkSize: '@'
      },
      controller: 'MwlCalendarCtrl as vm',
      bindToController: true
    };

  });
