/*************************************************
 *  academia
 *  https://github.com/gcushen/hugo-academia
 *
 *  Core JS functions and initialization.
 **************************************************/

(function ($) {

  /* ---------------------------------------------------------------------------
   * Responsive scrolling for URL hashes.
   * --------------------------------------------------------------------------- */

  // Dynamically get responsive navigation bar offset.
  let $navbar = $('.navbar');
  let navbar_offset = $navbar.innerHeight();

  /**
   * Responsive hash scrolling.
   * Check for a URL hash as an anchor.
   * If it exists on current page, scroll to it responsively.
   * If `target` argument omitted (e.g. after event), assume it's the window's hash.
   */
  function scrollToAnchor(target) {
    // If `target` is undefined or HashChangeEvent object, set it to window's hash.
    target = (typeof target === 'undefined' || typeof target === 'object') ? window.location.hash : target;
    // Escape colons from IDs, such as those found in Markdown footnote links.
    target = target.replace(/:/g, '\\:');

    // If target element exists, scroll to it taking into account fixed navigation bar offset.
    if ($(target).length) {
      $('body').addClass('scrolling');
      $('html, body').animate({
        scrollTop: $(target).offset().top - navbar_offset
      }, 600, function () {
        $('body').removeClass('scrolling');
      });
    }
  }

  // Make Scrollspy responsive.
  function fixScrollspy() {
    let $body = $('body');
    let data = $body.data('bs.scrollspy');
    if (data) {
      data._config.offset = navbar_offset;
      $body.data('bs.scrollspy', data);
      $body.scrollspy('refresh');
    }
  }

  function removeQueryParamsFromUrl() {
    if (window.history.pushState) {
      let urlWithoutSearchParams = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
      window.history.pushState({
        path: urlWithoutSearchParams
      }, '', urlWithoutSearchParams);
    }
  }

  // Check for hash change event and fix responsive offset for hash links (e.g. Markdown footnotes).
  window.addEventListener("hashchange", scrollToAnchor);

  /* ---------------------------------------------------------------------------
   * Add smooth scrolling to all links inside the main navbar.
   * --------------------------------------------------------------------------- */


  // animation scroll js
  var html_body = $('html, body');
  $('nav a, .page-scroll').on('click', function () { //use page-scroll class in any HTML tag for scrolling
    if (location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '') && location.hostname === this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        html_body.animate({
          scrollTop: target.offset().top - navbar_offset
        }, 1500, 'easeInOutExpo');
        return false;
      }
    }
  });

  // easeInOutExpo Declaration
  jQuery.extend(jQuery.easing, {
    easeInOutExpo: function (x, t, b, c, d) {
      if (t === 0) {
        return b;
      }
      if (t === d) {
        return b + c;
      }
      if ((t /= d / 2) < 1) {
        return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
      }
      return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
    }
  });

  /* ---------------------------------------------------------------------------
   * Hide mobile collapsable menu on clicking a link.
   * --------------------------------------------------------------------------- */

  $(document).on('click', '.navbar-collapse.show', function (e) {
    //get the <a> element that was clicked, even if the <span> element that is inside the <a> element is e.target
    let targetElement = $(e.target).is('a') ? $(e.target) : $(e.target).parent();

    if (targetElement.is('a') && targetElement.attr('class') != 'dropdown-toggle') {
      $(this).collapse('hide');
    }
  });

  /* ---------------------------------------------------------------------------
   * Filter publications.
   * --------------------------------------------------------------------------- */

  // Active publication filters.
  let pubFilters = {};

  // Search term.
  let searchRegex;

  // Filter values (concatenated).
  let filterValues;

  // Publication container.
  let $grid_pubs = $('#container-publications');

  // Initialise Isotope.
  $grid_pubs.isotope({
    itemSelector: '.isotope-item',
    percentPosition: true,
    masonry: {
      // Use Bootstrap compatible grid layout.
      columnWidth: '.grid-sizer'
    },
    filter: function () {
      let $this = $(this);
      let searchResults = searchRegex ? $this.text().match(searchRegex) : true;
      let filterResults = filterValues ? $this.is(filterValues) : true;
      return searchResults && filterResults;
    }
  });

  // Filter by search term.
  let $quickSearch = $('.filter-search').keyup(debounce(function () {
    searchRegex = new RegExp($quickSearch.val(), 'gi');
    $grid_pubs.isotope();
  }));

  // Debounce input to prevent spamming filter requests.
  function debounce(fn, threshold) {
    let timeout;
    threshold = threshold || 100;
    return function debounced() {
      clearTimeout(timeout);
      let args = arguments;
      let _this = this;

      function delayed() {
        fn.apply(_this, args);
      }
      timeout = setTimeout(delayed, threshold);
    };
  }

  // Flatten object by concatenating values.
  function concatValues(obj) {
    let value = '';
    for (let prop in obj) {
      value += obj[prop];
    }
    return value;
  }

  $('.pub-filters').on('change', function () {
    let $this = $(this);

    // Get group key.
    let filterGroup = $this[0].getAttribute('data-filter-group');

    // Set filter for group.
    pubFilters[filterGroup] = this.value;

    // Combine filters.
    filterValues = concatValues(pubFilters);

    // Activate filters.
    $grid_pubs.isotope();

    // If filtering by publication type, update the URL hash to enable direct linking to results.
    if (filterGroup == "pubtype") {
      // Set hash URL to current filter.
      let url = $(this).val();
      if (url.substr(0, 9) == '.pubtype-') {
        window.location.hash = url.substr(9);
      } else {
        window.location.hash = '';
      }
    }
  });

  // Filter publications according to hash in URL.
  function filter_publications() {
    let urlHash = window.location.hash.replace('#', '');
    let filterValue = '*';

    // Check if hash is numeric.
    if (urlHash != '' && !isNaN(urlHash)) {
      filterValue = '.pubtype-' + urlHash;
    }

    // Set filter.
    let filterGroup = 'pubtype';
    pubFilters[filterGroup] = filterValue;
    filterValues = concatValues(pubFilters);

    // Activate filters.
    $grid_pubs.isotope();

    // Set selected option.
    $('.pubtype-select').val(filterValue);
  }

  /* ---------------------------------------------------------------------------
   * Google Maps or OpenStreetMap via Leaflet.
   * --------------------------------------------------------------------------- */

  function initMap() {
    if ($('#map').length) {
      let map_provider = $('#map-provider').val();
      let lat = $('#map-lat').val();
      let lng = $('#map-lng').val();
      let zoom = parseInt($('#map-zoom').val());
      let address = $('#map-dir').val();
      let api_key = $('#map-api-key').val();

      if (map_provider == 1) {
        let map = new GMaps({
          div: '#map',
          lat: lat,
          lng: lng,
          zoom: zoom,
          zoomControl: true,
          zoomControlOpt: {
            style: 'SMALL',
            position: 'TOP_LEFT'
          },
          panControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          overviewMapControl: false,
          scrollwheel: true,
          draggable: true
        });

        map.addMarker({
          lat: lat,
          lng: lng,
          click: function (e) {
            let url = 'https://www.google.com/maps/place/' + encodeURIComponent(address) + '/@' + lat + ',' + lng + '/';
            window.open(url, '_blank')
          },
          title: address
        })
      } else {
        let map = new L.map('map').setView([lat, lng], zoom);
        if (map_provider == 3 && api_key.length) {
          L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 18,
            id: 'mapbox.streets',
            accessToken: api_key
          }).addTo(map);
        } else {
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }).addTo(map);
        }
        let marker = L.marker([lat, lng]).addTo(map);
        let url = lat + ',' + lng + '#map=' + zoom + '/' + lat + '/' + lng + '&layers=N';
        marker.bindPopup(address + '<p><a href="https://www.openstreetmap.org/directions?engine=osrm_car&route=' + url + '">Routing via OpenStreetMap</a></p>');
      }
    }
  }

  /* ---------------------------------------------------------------------------
   * GitHub API.
   * --------------------------------------------------------------------------- */

  function printLatestRelease(selector, repo) {
    $.getJSON('https://api.github.com/repos/' + repo + '/tags').done(function (json) {
      let release = json[0];
      $(selector).append(' ' + release.name);
    }).fail(function (jqxhr, textStatus, error) {
      let err = textStatus + ", " + error;
      console.log("Request Failed: " + err);
    });
  }

  /* ---------------------------------------------------------------------------
   * Toggle search dialog.
   * --------------------------------------------------------------------------- */

  function toggleSearchDialog() {
    if ($('body').hasClass('searching')) {
      $('[id=search-query]').blur();
      $('body').removeClass('searching');
      removeQueryParamsFromUrl();
    } else {
      $('body').addClass('searching');
      $('.search-results').css({
        opacity: 0,
        visibility: 'visible'
      }).animate({
        opacity: 1
      }, 200);
      $('#search-query').focus();
    }
  }

  /* ---------------------------------------------------------------------------
   * Toggle day/night mode.
   * --------------------------------------------------------------------------- */

  function toggleDarkMode(codeHlEnabled, codeHlLight, codeHlDark, diagramEnabled) {
    if ($('body').hasClass('dark')) {
      $('body').css({
        opacity: 0,
        visibility: 'visible'
      }).animate({
        opacity: 1
      }, 500);
      $('body').removeClass('dark');
      if (codeHlEnabled) {
        codeHlLight.disabled = false;
        codeHlDark.disabled = true;
      }
      $('.js-dark-toggle i').removeClass('fa-sun').addClass('fa-moon');
      localStorage.setItem('dark_mode', '0');
      if (diagramEnabled) {
        // TODO: Investigate Mermaid.js approach to re-render diagrams with new theme without reloading.
        location.reload();
      }
    } else {
      $('body').css({
        opacity: 0,
        visibility: 'visible'
      }).animate({
        opacity: 1
      }, 500);
      $('body').addClass('dark');
      if (codeHlEnabled) {
        codeHlLight.disabled = true;
        codeHlDark.disabled = false;
      }
      $('.js-dark-toggle i').removeClass('fa-moon').addClass('fa-sun');
      localStorage.setItem('dark_mode', '1');
      if (diagramEnabled) {
        // TODO: Investigate Mermaid.js approach to re-render diagrams with new theme without reloading.
        location.reload();
      }
    }
  }

  /* ---------------------------------------------------------------------------
   * Normalize Bootstrap Carousel Slide Heights.
   * --------------------------------------------------------------------------- */

  function normalizeCarouselSlideHeights() {
    $('.carousel').each(function () {
      // Get carousel slides.
      let items = $('.carousel-item', this);
      // Reset all slide heights.
      items.css('min-height', 0);
      // Normalize all slide heights.
      let maxHeight = Math.max.apply(null, items.map(function () {
        return $(this).outerHeight()
      }).get());
      items.css('min-height', maxHeight + 'px');
    })
  }

  /* ---------------------------------------------------------------------------
   * On document ready.
   * --------------------------------------------------------------------------- */

  $(document).ready(function () {
    // Fix Hugo's auto-generated Table of Contents.
    //   Must be performed prior to initializing ScrollSpy.
    $('#TableOfContents > ul > li > ul').unwrap().unwrap();
    $('#TableOfContents').addClass('nav flex-column');
    $('#TableOfContents li').addClass('nav-item');
    $('#TableOfContents li a').addClass('nav-link');

    // Set dark mode if user chose it.
    let default_mode = 0;
    if ($('body').hasClass('dark')) {
      default_mode = 1;
    }
    let dark_mode = parseInt(localStorage.getItem('dark_mode') || default_mode);

    // Is code highlighting enabled in site config?
    const codeHlEnabled = $('link[title=hl-light]').length > 0;
    const codeHlLight = $('link[title=hl-light]')[0];
    const codeHlDark = $('link[title=hl-dark]')[0];
    const diagramEnabled = $('script[title=mermaid]').length > 0;

    if (dark_mode) {
      $('body').addClass('dark');
      if (codeHlEnabled) {
        codeHlLight.disabled = true;
        codeHlDark.disabled = false;
      }
      if (diagramEnabled) {
        mermaid.initialize({
          theme: 'dark'
        });
      }
      $('.js-dark-toggle i').removeClass('fa-moon').addClass('fa-sun');
    } else {
      $('body').removeClass('dark');
      if (codeHlEnabled) {
        codeHlLight.disabled = false;
        codeHlDark.disabled = true;
      }
      if (diagramEnabled) {
        mermaid.initialize({
          theme: 'default'
        });
      }
      $('.js-dark-toggle i').removeClass('fa-sun').addClass('fa-moon');
    }

    // Toggle day/night mode.
    $('.js-dark-toggle').click(function (e) {
      e.preventDefault();
      toggleDarkMode(codeHlEnabled, codeHlLight, codeHlDark, diagramEnabled);
    });
  });

  /* ---------------------------------------------------------------------------
   * On window loaded.
   * --------------------------------------------------------------------------- */

  $(window).on('load', function () {
    if (window.location.hash) {
      // When accessing homepage from another page and `#top` hash is set, show top of page (no hash).
      if (window.location.hash == "#top") {
        window.location.hash = ""
      } else if (!$('.projects-container').length) {
        // If URL contains a hash and there are no dynamically loaded images on the page,
        // immediately scroll to target ID taking into account responsive offset.
        // Otherwise, wait for `imagesLoaded()` to complete before scrolling to hash to prevent scrolling to wrong
        // location.
        scrollToAnchor();
      }
    }

    // Initialize Scrollspy.
    let $body = $('body');
    $body.scrollspy({
      offset: navbar_offset
    });

    // Call `fixScrollspy` when window is resized.
    let resizeTimer;
    $(window).resize(function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fixScrollspy, 200);
    });

    // Filter projects.
    $('.projects-container').each(function (index, container) {
      let $container = $(container);
      let $section = $container.closest('section');
      let layout;
      if ($section.find('.isotope').hasClass('js-layout-row')) {
        layout = 'fitRows';
      } else {
        layout = 'masonry';
      }

      $container.imagesLoaded(function () {
        // Initialize Isotope after all images have loaded.
        $container.isotope({
          itemSelector: '.isotope-item',
          layoutMode: layout,
          masonry: {
            gutter: 20
          },
          filter: $section.find('.default-project-filter').text()
        });

        // Filter items when filter link is clicked.
        $section.find('.project-filters a').click(function () {
          let selector = $(this).attr('data-filter');
          $container.isotope({
            filter: selector
          });
          $(this).removeClass('active').addClass('active').siblings().removeClass('active all');
          return false;
        });

        // If window hash is set, scroll to hash.
        // Placing this within `imagesLoaded` prevents scrolling to the wrong location due to dynamic image loading
        // affecting page layout and position of the target anchor ID.
        // Note: If there are multiple project widgets on a page, ideally only perform this once after images
        // from *all* project widgets have finished loading.
        if (window.location.hash) {
          scrollToAnchor();
        }
      });
    });

    // Enable publication filter for publication index page.
    if ($('.pub-filters-select')) {
      filter_publications();
      // Useful for changing hash manually (e.g. in development):
      // window.addEventListener('hashchange', filter_publications, false);
    }

    // Load citation modal on 'Cite' click.
    $('.js-cite-modal').click(function (e) {
      e.preventDefault();
      let filename = $(this).attr('data-filename');
      let modal = $('#modal');
      modal.find('.modal-body code').load(filename, function (response, status, xhr) {
        if (status == 'error') {
          let msg = "Error: ";
          $('#modal-error').html(msg + xhr.status + " " + xhr.statusText);
        } else {
          $('.js-download-cite').attr('href', filename);
        }
      });
      modal.modal('show');
    });

    // Copy citation text on 'Copy' click.
    $('.js-copy-cite').click(function (e) {
      e.preventDefault();
      // Get selection.
      let range = document.createRange();
      let code_node = document.querySelector('#modal .modal-body');
      range.selectNode(code_node);
      window.getSelection().addRange(range);
      try {
        // Execute the copy command.
        document.execCommand('copy');
      } catch (e) {
        console.log('Error: citation copy failed.');
      }
      // Remove selection.
      window.getSelection().removeRange(range);
    });

    // Initialise Google Maps if necessary.
    initMap();

    // Print latest version of GitHub projects.
    let githubReleaseSelector = '.js-github-release';
    if ($(githubReleaseSelector).length > 0)
      printLatestRelease(githubReleaseSelector, $(githubReleaseSelector).data('repo'));

    // On search icon click toggle search dialog.
    $('.js-search').click(function (e) {
      e.preventDefault();
      toggleSearchDialog();
    });
    $(document).on('keydown', function (e) {
      if (e.which == 27) {
        // `Esc` key pressed.
        if ($('body').hasClass('searching')) {
          toggleSearchDialog();
        }
      } else if (e.which == 191 && e.shiftKey == false && !$('input,textarea').is(':focus')) {
        // `/` key pressed outside of text input.
        e.preventDefault();
        toggleSearchDialog();
      }
    });

  });

  // Normalize Bootstrap carousel slide heights.
  $(window).on('load resize orientationchange', normalizeCarouselSlideHeights);

})(jQuery);

