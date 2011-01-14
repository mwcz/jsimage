/**
 * JSImage is an object for basic image manipulation and processing.
 * It uses the HTML <canvas> element and JavaScript to do the dirty
 * work.
 *
 * @constructor
 * @param arg_canvas_id The id of the canvas element.
 * @arg_image_src The path to the image to be loaded into the canvas.
 */
function JSImage( arg_canvas_id, arg_image_src ) {
    //console.log("Constructor called: JSImage( \"%s\", \"%s\" )", arg_canvas_id, arg_image_src );

    /*******************************
     * Private instance variables. *
     *******************************/
    
    var marquee;
    var that = this; // hack to allow inner methods to access instance variables
    var canvas_element = document.getElementById( arg_canvas_id ); // Establish references to the canvas element and the canvas itself
    var img; // reference for the image to be loaded into the canvas
    var cs = new ColorSpace(); // used for colorspace conversions.  colorspace.js must be included by the html page


    /*****************************************************
     * Check for canvas support.  Still not sure exactly *
     * what should be done if canvas isn't supported.    *
     *****************************************************/

    if( !canvas_element.getContext ) {
        alert("You are using a browser without support for the <canvas> object.  JSImage will not be available to you.");
        return -1;
    }

    /******************************
     * Public instance variables. *
     ******************************/

    this.id = arg_canvas_id;
    this.src = arg_image_src;
    this.canvas; // reference for the real canvas (not the element)
    this.width;
    this.height;
    this.imagedata;

    this.canvas = canvas_element.getContext('2d');
    img = new Image();
    img.src = arg_image_src; // fetch the image from the server

    /**
     * When the image is done being loaded, resize its canvas
     * to fit and then draw the image.
     *
     * @private
     */
    img.onload = function() {
        // Resize the canvas element to fit the image
        that.width = canvas_element.width = img.width;
        that.height = canvas_element.height = img.height;
        that.canvas.drawImage( img, 0, 0 );
        //console.time("get image data");
        that.imagedata = that.canvas.getImageData( 
                                0, // x coord
                                0, // y coord
                                canvas_element.width, // width of rectangle to return
                                canvas_element.height // height of rectangle to return
                                ); // we only care about the data attribute
        //console.timeEnd("get image data");
    }


    /**
     * Fetch a remote image and draw it into the canvas.
     *
     * @private
     */
    this.load_image = function( image_path ) {

        img = new Image();
        img.src = image_path; // fetch the image from the server

        // Resize the canvas element to fit the image
        that.width  = canvas_element.width  = img.width;
        that.height = canvas_element.height = img.height;

        that.canvas.drawImage( img, 0, 0 );

        that.imagedata = that.canvas.getImageData( 
                                0,                    // x coord
                                0,                    // y coord
                                canvas_element.width, // width of rectangle to return
                                canvas_element.height // height of rectangle to return
                                );                    // we only care about the data attribute

    }




    /**
     * Draws the current pixel array onto a canvas.
     *
     * @param cnvs a canvas to draw the current pixel array upon.  uses this canvas if none is specified.
     */
    this.draw = function( cnvs ) {

        if(!cnvs) cnvs = this.canvas;

        var data = this.imagedata;

        //console.time("putting image data");
        this.canvas.putImageData( data, 0, 0 );
        //console.timeEnd("putting image data");

    }


    /**
     * Returns the pixels from a rectangular area.
     *
     * @returns A linear array of the pixels (R,G,B,A,R,G,B,A, ... )
     */
    this.getrect = function( x, y, w, h ) {
        return this.canvas.getImageData( x, y, w, h ).data;
    }


    /**
     * Averages the pixels in a linear array and returns the result.
     *
     * @returns An array (R,G,B,A) of the average pixel value
     */
    this.avg = function( pixels ) {

        var result = new Array(0,0,0,0);

        for( var i = 0; i < pixels.length; i+=4 ) {
            result[0] += pixels[i];
            result[1] += pixels[i+1];
            result[2] += pixels[i+2];
            result[3] += pixels[i+3];
        }

        result[0] = Math.round( result[0] / parseInt( pixels.length / 4 ) );
        result[1] = Math.round( result[1] / parseInt( pixels.length / 4 ) );
        result[2] = Math.round( result[2] / parseInt( pixels.length / 4 ) );
        result[3] = Math.round( result[3] / parseInt( pixels.length / 4 ) );

        return result;
    }


    /**
     * Makes the canvas draggable.
     */
    this.draggable = function() {
        marquee = new Marquee( that.id, { color: '#000', opacity: 0.6}); 
        marquee.setOnUpdateCallback( upd = function() {
            var xywh = marquee.getCoords();
            if( !xywh.width || !xywh.height ) return -1; // selection has 0 area, return error
            //console.log(xywh);
            var rect = that.getrect( xywh.x1, xywh.y1, xywh.width, xywh.height );
            //console.log(rect);
            var av = that.avg( rect );
            //console.log(av);
            document.body.style.background = "rgb(" + av[0] + "," + av[1] + "," + av[2] + ")";
        });
    }


    /**
     * Draws a histogram of this canvas on the target canvas.
     * If no target canvas is specified, it is drawn on top
     * of this canvas.
     *
     * @param cnvs a canvas to draw the histogram upon; default is this canvas
     * @param channel which band of the image to draw the histogram of, 'r', 'g', or 'b'
     * @param color the color of the histogram bars
     * @param backgorund the color of the background
     */
    this.histo = function( cnvs, channel, color, background ) {

        if(!cnvs) cnvs = this.canvas;

        var band;
        switch( channel ) {
            case 'r': band = 0; break;
            case 'g': band = 1; break;
            case 'b': band = 2; break;
            default: //console.log('Invalid channel provided.'); return;
        }

        cnvs.fillStyle = background;
        cnvs.fillRect( 0, 0, this.width, this.height );

        var histo = new Array();
        var max = 0; // will store the highest value in the histogram

        // Initialize the histogram to all zeroes.
        for( var i = 0; i < 256; i++ )
            histo[i] = 0;

        // Build the histo
        for( var x = 0; x < this.getpixelarray().length; x++ ) {
            for( var y = 0; y < this.getpixelarray()[0].length; y++ ) {
                var pix = this.getpixelarray()[x][y];
                histo[ pix[ band ] ]++;
                if( max < histo[ pix[ band ] ] ) max = histo[ pix[ band ] ];
            }
        }

        // Draw the histo
        cnvs.strokeStyle = color;
        for( var i = 0; i < 256; i++ ) {

            var bar_height = parseInt( this.height - ( histo[i] * this.height / max ) );

            cnvs.beginPath();
            cnvs.moveTo( i, this.height );
            cnvs.lineTo( i, bar_height );
            cnvs.stroke();
        }

    }

    /**
     * Bins the histogram to the requested number of bins (aka columns!), using simple averages.
     *
     * @return bin
     */
    this.bin = function( histogram, bins ) {

        var bin = new Array();

        var histo_len  = histogram.length;

        // binning scales
        shrink_x = parseFloat( bins ) / parseFloat( histo_len );
        //console.log( "binning scale (x): %f", shrink_x );

        //console.log( "histo_len: %d", histo_len );
        var span = parseInt( ( parseFloat( histo_len ) / parseFloat( bins ) ) / 2 ) + 1; // how far to the left and right to "reach" for values to average with
        //console.log( "span: %d", span );

        for( var i = 0; i < bins; i++ ) {

            var p = 0;
            //determine left bound (either 0 or i - span)
            //determine right bound ( either histo_len-1 or i + span)
            //calculate average of items from left bound to right bound (inclusive)
            var left_bound  = Math.max( 0, ( i - span ) );
            var right_bound = Math.max( ( histo_len - 1 ), ( i + span ) );

            for( var j = left_bound; j <= right_bound; j++ )
                p += histogram[ j ]; //add the value.  averaging them will come later

            p /= ( right_bound - left_bound ); //reduce value to the average

            //we now have the final value for this bin
            bin[i] = p;
        }

        return bin
    }

    /**
     * Draws an inverted image of this canvas.
     *
     * @param cnvs optional canvas to draw the inverted image upon.  uses this canvas if none is provided.
     */
    this.invert = function( cnvs ) {

        // use this canvas as default
        if(!cnvs) cnvs = this.canvas;

        var data = this.imagedata.data;

        //console.time("Invert");
        for( var i = data.length-1; i >= 0; i-=4 ) {
            data[i - 3] = 255 - data[i - 3];
            data[i - 2] = 255 - data[i - 2];
            data[i - 1] = 255 - data[i - 1];
        }
        //console.timeEnd("Invert");

        
        this.draw( cnvs );

    }


    /**
     * Performs a threshold operation on the canvas.
     *
     * @param cnvs optional canvas to draw the inverted image upon.  uses this canvas if none is provided.
     * @param threshold a value from 0..255
     */
    this.threshold = function( cnvs, t ) {

        // use this canvas as default
        if(!cnvs) cnvs = this.canvas;

        for( var x = 0; x < this.getpixelarray().length; x++ ) {
            for( var y = 0; y < this.height; y++ ) {
                var b = Math.max(
                            this.pixelarray[x][y][0],
                            this.pixelarray[x][y][1],
                            this.pixelarray[x][y][2]);
                var a = this.pixelarray[x][y][3];
                this.pixelarray[x][y] = ( b >= t ) ?  new Array(255,255,255,a) : new Array(0,0,0,a);
            }
        }
        
        this.draw( cnvs );

    }

    /**
     * Raises or lowers the hue.
     *
     * @param cnvs optional canvas to draw the inverted image upon.  uses this canvas if none is provided.
     * @param h the amount by which to adjust the hue
     */
    this.hue = function( cnvs, h ) {

        // use this canvas as default
        if(!cnvs) cnvs = this.canvas;

        for( var x = 0; x < this.getpixelarray().length; x++ ) {
            for( var y = 0; y < this.height; y++ ) {
                var hsv = cs.rgb_to_hsv(
                            this.pixelarray[x][y][0],
                            this.pixelarray[x][y][1],
                            this.pixelarray[x][y][2]);
                hsv[0] += h;   // adjust hue by h
                hsv[0] %= 360; // h must be 0..359
                rgb = cs.hsv_to_rgb( hsv[0], hsv[1], hsv[2] );
                var a = this.pixelarray[x][y][3];
                this.pixelarray[x][y] = new Array( 
                                                rgb[0],
                                                rgb[1],
                                                rgb[2],
                                                a);
            }
        }
        
        this.draw( cnvs );

    }


    /**
     * Raises or lowers the brightness.
     *
     * @param cnvs optional canvas to draw the inverted image upon.  uses this canvas if none is provided.
     * @param b the amount by which to adjust the brightness
     */
    this.value = function( cnvs, v ) {

        // use this canvas as default
        if(!cnvs) cnvs = this.canvas;

        var data = this.imagedata.data;
        // RGB ratios
        var rgr, gbr; // red-green ratio, green-blue ratio
        var r, g, b;

        //console.time("Value");
        for( var i = data.length-1; i >= 0; i-=4 ) {

            r = data[i-3];
            g = data[i-2];
            b = data[i-1];

            rgr = r / g;
            gbr = g / b;

            if( r > g && r > b ) { // red is max
                r += v;
                r = ( r > 255 ) ? 255 : ( r < 0 ) ? 0 : r;
                g = r / rgr;
                b = g / gbr;
            } else if( g > r && g > b ) { // green is max
                g += v;
                g = ( g > 255 ) ? 255 : ( g < 0 ) ? 0 : g;
                r = g * rgr;
                b = g / gbr;
            } else if( b > r && b > g ) { // blue is max
                b += v;
                b = ( b > 255 ) ? 255 : ( b < 0 ) ? 0 : b;
                g = b * gbr;
                r = g * rgr;
            } else if( r > b ) { // red and green are max
                b += v;
                b = ( b > 255 ) ? 255 : ( b < 0 ) ? 0 : b;
                g = b * gbr;
                r = g * rgr;
            }

            data[ i - 3 ] = r;
            data[ i - 2 ] = g;
            data[ i - 1 ] = b;

        }
        //console.timeEnd("Value");

        
        this.draw( cnvs );

    }


    /**
     * Raises or lowers the saturation.
     *
     * @param cnvs optional canvas to draw the inverted image upon.  uses this canvas if none is provided.
     * @param s the amount by which to adjust the saturation
     */
    this.saturation = function( cnvs, s ) {

        // use this canvas as default
        if(!cnvs) cnvs = this.canvas;

        for( var x = 0; x < this.getpixelarray().length; x++ ) {
            for( var y = 0; y < this.height; y++ ) {
                var hsv = cs.rgb_to_hsv(
                            this.pixelarray[x][y][0],
                            this.pixelarray[x][y][1],
                            this.pixelarray[x][y][2]);
                hsv[1] += s;   // adjust hue by h
                // clamp value on 0..255
                if( hsv[1] > 255 ) hsv[1] == 255;
                if( hsv[1] < 0   ) hsv[1] == 0;
                rgb = cs.hsv_to_rgb( hsv[0], hsv[1], hsv[2] );
                var a = this.pixelarray[x][y][3];
                this.pixelarray[x][y] = new Array( 
                                                rgb[0],
                                                rgb[1],
                                                rgb[2],
                                                a);
            }
        }
        
        this.draw( cnvs );

    }


    /**
     * Raises or lowers the contrast.
     *
     * @param cnvs optional canvas to draw the inverted image upon.  uses this canvas if none is provided.
     * @param c the factor by which to increase or decrease the contrast.
     */
    this.contrast = function( cnvs, c ) {

        // use this canvas as default
        if(!cnvs) cnvs = this.canvas;

        for( var x = 0; x < this.getpixelarray().length; x++ ) {
            for( var y = 0; y < this.height; y++ ) {

                var p = this.pixelarray[x][y];

                // adjust pixel by factor c
                p[0] = parseInt( c * p[0] );
                p[1] = parseInt( c * p[1] );
                p[2] = parseInt( c * p[2] );

                // clamp values on 0..255
                if( p[0] > 255 ) p[0] == 255;
                if( p[0] < 0   ) p[0] == 0;
                if( p[1] > 255 ) p[1] == 255;
                if( p[1] < 0   ) p[1] == 0;
                if( p[2] > 255 ) p[2] == 255;
                if( p[2] < 0   ) p[2] == 0;

                //console.log( p );

            }
        }
        
        this.draw( cnvs );

    }

    /**
     * Multiplies each pixel in the canvas by a RGB 3-tuple.
     *
     * @param cnvs optional canvas to draw the multiplied image upon.  uses this canvas if none is provided.
     * @param color the color by which to multiply each pixel in the canvas
     */
    this.multiply = function( cnvs, r, g, b ) {


        // use this canvas as default
        if(!cnvs) cnvs = this.canvas;

        r = ( r > 255 ) ? 255 : ( r > 0 ) ? r : 0;
        g = ( g > 255 ) ? 255 : ( g > 0 ) ? g : 0;
        b = ( b > 255 ) ? 255 : ( b > 0 ) ? b : 0;

        r = ( r > 1 ) ? r / 255 : r;
        g = ( g > 1 ) ? g / 255 : g;
        b = ( b > 1 ) ? b / 255 : b;

        var data = this.imagedata.data;

        //console.time("Multiply");
        for( var i = data.length-1; i >= 0; i-=4 ) {

            data[ i - 3 ] = data[ i - 3 ] * r;
            data[ i - 2 ] = data[ i - 2 ] * g;
            data[ i - 1 ] = data[ i - 1 ] * b;

        }
        //console.timeEnd("Multiply");

        
        this.draw( cnvs );

    }



} // End of JSImage constructor


