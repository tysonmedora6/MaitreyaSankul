var phImage;
var fadeInDuration;
var imgSeparator = '#';
var richTextSeparator = "&??";
var isIE;

var initLazyLoading = function () {
    phImage = document.getElementById("_imageLazyLoadingScript").getAttribute("phImage");
    fadeInDuration = document.getElementById("_imageLazyLoadingScript").getAttribute("fadeInDuration");

    //checking if current browser is IE
    //MSIE used to detect old IE browsers and Trident used to detect newer ones
    var ua = window.navigator.userAgent;
    isIE = ua.indexOf("MSIE ") > -1 || ua.indexOf("Trident/") > -1;

    if (isNaN(fadeInDuration)) {
        fadeInDuration = 2000;
    }

    if ("IntersectionObserver" in window) {
        var lazyLoadElements = document.querySelectorAll("img[src*='" + imgSeparator + "'], [srcset*='" + imgSeparator + "'], *[style*='" + imgSeparator + "'], img[src*='&??']");
        var imageObserver = new IntersectionObserver(function (entries, observer) {
            var isProductHighlightImage = false;
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var image = entry.target;
                    loadElement(image);
                    observer.unobserve(image);

                    //check if current image is within Product Highlight
                    if (image.offsetParent && image.offsetParent.className.indexOf('rde-product-highlight') >= 0) {
                        isProductHighlightImage = true;
                    }
                }
            });

            //if current image is within Product Highlight, 'productHighlightUpdated' event is triggered and EventListener from main.js will call match height
            if (isProductHighlightImage) {
                var highlightEvent = document.createEvent('Event');
                highlightEvent.initEvent('productHighlightUpdated', true, true);
                //dispatch event after 200ms to give images time to load
                setTimeout(function () {
                    window.dispatchEvent(highlightEvent);
                }, 300);
            }
        });

        lazyLoadElements.forEach(function (image) {
            imageObserver.observe(image);
        });
    }
    else {
        var lazyloadThrottleTimeout;
        var lazyLoadElements = Array.prototype.slice.call(document.querySelectorAll("img[src*='" + imgSeparator + "'], [srcset*='" + imgSeparator + "'],  *[style*='" + imgSeparator + "'], img[src*='&??']"), 0);

        function lazyLoad() {
            if (lazyloadThrottleTimeout) {
                clearTimeout(lazyloadThrottleTimeout);
            }

            lazyloadThrottleTimeout = setTimeout(function () {
                var scrollTop = window.pageYOffset;
                lazyLoadElements.forEach(function (element) {
                    if (element.offsetTop < (window.innerHeight + scrollTop)) {
                        loadElement(element);
                    }
                });
                if (lazyLoadElements.length == 0) {
                    document.removeEventListener("scroll", lazyLoad);
                    window.removeEventListener("resize", lazyLoad);
                    window.removeEventListener("orientationChange", lazyLoad);
                }
            }, 20);
        }

        // For the current viewport that just loaded call lazyLoad
        lazyLoad();

        document.addEventListener("scroll", lazyLoad);
        window.addEventListener("resize", lazyLoad);
        window.addEventListener("orientationChange", lazyLoad);
    }
}

var loadElement = function (element) {
    // Element is image and meet lazy load requirements 
    if (element.src) {
        if (element.src.indexOf(imgSeparator) >= 0) {
            loadImage(element, imgSeparator);
        }

        if (element.src.indexOf(richTextSeparator) >= 0) {
            loadImage(element, richTextSeparator);
        }
    }
    // Element is picture source and meet lazy load requirements 
    if (element.srcset && element.srcset.indexOf(imgSeparator) >= 0) { 
        loadImageSource(element, imgSeparator);
    }
    // Element contains image as a background
    if (element.style && element.style.cssText.indexOf(imgSeparator) >= 0) {
        loadBackground(element);
    }

    var lazyEvent = element.getAttribute("lazy-event");

    if (lazyEvent) {
        var lazyEventArgs = element.getAttribute("lazy-event-args");
        var event = new CustomEvent(lazyEvent, { 'detail': { args: lazyEventArgs } });
        //dispatch event after 300ms to give images time to load
        setTimeout(function () {
            window.dispatchEvent(event);
        }, 300);
    }
}

var loadImage = function (image, separator) {
    if (isIE || window.innerWidth < 991) {
        image.src = image.src.split(separator)[1];
    } else {
        image.style.opacity = 0;
        image.src = image.src.split(separator)[1];
        fadeIn(image);
    }
}

var loadImageSource = function (image, separator) {
    if (isIE || window.innerWidth < 991) {
        image.srcset = image.srcset.split(separator)[1];
    } else {
        image.style.opacity = 0;
        image.srcset = image.srcset.split(separator)[1];
        fadeIn(image);
    }
}

var lazyLoadingLoadAll = function () {
    var lazyLoadElements = Array.prototype.slice.call(document.querySelectorAll("img[src*='" + imgSeparator + "'], *[style*='" + imgSeparator + "'], img[src*='&??']"), 0);
    lazyLoadElements.forEach(function (item, i) {
        loadElement(item);
    });
}

var loadBackground = function (element) {
    if (element.style.cssText.indexOf(phImage) >= 0) {
        processStyle(element, phImage);
        return;
    }
    // Workaround for Safari which renders images excluding port from image url
    var placeholder = phImage.replace(/:\d+/, "");
    if (element.style.cssText.indexOf(placeholder) >= 0) {
        processStyle(element, placeholder);
        return;
    }
}

var processStyle = function (element, placeholder) {
    var start = element.style.cssText.indexOf(placeholder);
    var end = element.style.cssText.indexOf(imgSeparator) + imgSeparator.length;
    var replacement = element.style.cssText.substring(start, end);

    if (isIE) {
        element.style.cssText = element.style.cssText.replace(replacement, "");
    } else {
        element.style.opacity = 0;
        element.style.cssText = element.style.cssText.replace(replacement, "");
        fadeIn(element);
    }
}

function fadeIn(element) {
    element.style.opacity = 0;

    var last = +new Date();
    var tick = function () {
        element.style.opacity = +element.style.opacity + (new Date() - last) / fadeInDuration;
        last = +new Date();

        if (+element.style.opacity < 1) {
            (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16);
        }
    };

    tick();
}

document.addEventListener("DOMContentLoaded", function () {
    if ("Coveo" in window) {
        var root = document.body;
        if (root) {
            Coveo.$$(root).on("newResultsDisplayed",
                function(e, args) {
                    initLazyLoading();
                });
        }
    }
});

window.addEventListener('productChanged', function (e) {
    initLazyLoading();
});

window.addEventListener('drRendered', function (e) {
    initLazyLoading();
});
