/**
 * Everlasting Labyrinth
 */

/**
 * GitHub Repository:
 * https://github.com/silent-tempest/Everlasting-Labyrinth/
 */

/**
 * @wout werkman gave me some motivation to start this project.
 * https://code.sololearn.com/WcplRQ5Vli0a/?ref=app
 * https://www.sololearn.com/Profile/7575091/?ref=app
 * It uses Maze Generator by dstromberg2:
 * https://github.com/dstromberg2/maze-generator
 */

/* jshint esversion: 5, unused: true, undef: true */
/* global newMaze, v6, _, document, platform */

;( function ( window ) {

'use strict';

var level = 1,
    final_level = 10;

var CAMERA_ZOOM = 1,
    CAMERA_SPEED = 0.1;

var SIZE = 16;

var FADE_START = 0 * SIZE,
    FADE_END = 15 * SIZE;

var OBJECTS = {
  WALL  : '#',
  EXIT  : '$',
  PLAYER: 'o'
};

var bazfoo = {
  '0': OBJECTS.WALL,
  '1': null
};

/** WebGL slow in iOS Safari and on PC. */
var safari = platform.os &&
  platform.os.family === 'iOS' &&
  platform.name === 'Safari';

var touchable = 'ontouchend' in window,
    mode = touchable && !safari ? 'webgl' : '2d';

var max = Math.max,
    min = Math.min;

var intersects = {
  'rectangle-point': function ( x1, y1, w1, h1, x2, y2 ) {
    return x2 < x1 + w1 && x2 > x1 && y2 < y1 + h1 && y2 > y1;
  },

  'rectangle-circle': function ( x1, y1, w1, h1, x2, y2, r2 ) {
    var dx, dy;

    // first check rect-rect intersection
    if ( x1 > x2 + r2 || x1 + w1 < x2 - r2 ||
         y1 > y2 + r2 || y1 + h1 < y2 - r2 )
    {
      return false;
    }

    // check corners
    dx = x2 - max( min( x2, x1 + w1 ), x1 );
    dy = y2 - max( min( y2, y1 + h1 ), y1 );

    return dx * dx + dy * dy < r2 * r2;
  }
};

var Circle = function ( x, y, r ) {
  this.location = v6.vec2( x, y );
  this.velocity = v6.vec2();
  this.radius = r;
};

Circle.prototype = {
  Move: function ( x, dt ) {
    var i = 1,
        loc = this.location,
        last = walls.length - 1,
        spd = this.velocity[ x ] * dt / i,
        j, wall;

    for ( ; i > 0; --i ) {
      loc[ x ] += spd;

      for ( j = last; j >= 0; --j ) {
        wall = walls[ j ];

        if ( this.Intersects( wall ) ) {
          loc[ x ] -= spd;
          return this;
        }
      }
    }

    return this;
  },

  Intersects: function ( wall ) {
    return intersects[ 'rectangle-circle' ](
      wall.location[ 0 ],
      wall.location[ 1 ],
      wall.w,
      wall.h,
      this.location[ 0 ],
      this.location[ 1 ],
      this.radius );
  },

  Render: function () {
    renderer
      .stroke( 255 )
      .arc( this.location[ 0 ], this.location[ 1 ], this.radius );

    return this;
  },

  speed: 8 * SIZE,
  constructor: Circle
};

var Wall = function ( x, y, w, h ) {
  this.location = v6.vec2( x, y );
  this.w = w;
  this.h = h;
};

Wall.prototype = {
  Render: function () {
    var x = this.location[ 0 ],
        y = this.location[ 1 ],
        d = v6.dist( x, y,
          object.location[ 0 ],
          object.location[ 1 ] ),
        w, h;

    if ( d < FADE_END && camera.sees( x, y, w = this.w, h = this.h ) ) {
      renderer
        .stroke( v6.map( d, FADE_START, FADE_END, 255, 0, true ) )
        .rect( x, y, w, h );
    }

    return this;
  },

  constructor: Wall
};

if ( touchable ) {
  var BIG_R = 45,
      SMALL_R = BIG_R * 0.6;

  /** Makes from 3D-like normalized coordinates 2D. */
  var foo = function ( value, size ) {
    return ( value + 1 ) * 0.5 * size;
  };

  /** Converts touch zone with 3D coordinates in 2D. */
  var GetTouchZone = function ( values, w, h ) {
    var x1 = foo( values[ 0 ], w ),
        y1 = foo( values[ 1 ], h ),
        x2 = foo( values[ 2 ], w ),
        y2 = foo( values[ 3 ], h );

    return [
      x1, y1, x2 - x1, y2 - y1
    ];
  };

  /** One stick of gamepad. */
  var Stick = function ( options ) {
    var renderer_options = {
      mode: mode
    };

    var that = this,
        renderer = that.renderer =
          v6( renderer_options ).noFill(),
        identifiers = that.__identifiers = [],
        start = that.start = v6.vec2(),
        location = that.location = v6.vec2(),
        touch_zone;

    var touchstart = function ( event ) {
      var touches = event.changedTouches,
          i = touches.length,
          unset = true,
          touch, touched, x, y;

      while ( i > 0 ) {
        touch = touches[ --i ];

        /** A finger on the stick touch zone? */
        touched = identifiers[ touch.identifier ] =
          intersects[ 'rectangle-point' ](
            touch_zone[ 0 ],
            touch_zone[ 1 ],
            touch_zone[ 2 ],
            touch_zone[ 3 ],
            x = touch.clientX,
            y = touch.clientY );

        /** If yes, and this last event from the `touches` (reverse loop). */
        if ( touched && unset ) {
          /** Then handle it! */
          start.set( x, y );
          that.state = 1;
          that.redraw = unset = true;
          that._angle = that._value = null;
        }
      }
    };

    var touchmove = function ( event ) {
      var touches = event.changedTouches,
          i = touches.length,
          touch;

      while ( i > 0 ) {
        /** if this finger interacts with the stick (on `touchstart` was in the touch zone). */
        if ( identifiers[ ( touch = touches[ --i ] ).identifier ] ) {
          /** Move the movable part of the stick. */
          location
            .set( touch.clientX - start[ 0 ], touch.clientY - start[ 1 ] )
            .limit( BIG_R );
          that.state = 2;
          that.redraw = true;
          that._angle = that._value = null;
          break;
        }
      }
    };

    var touchend = function ( event ) {
      var touches = event.changedTouches,
          i = touches.length,
          unset = true,
          id;

      while ( i > 0 ) {
        /** if this finger interacts with the stick before. */
        if ( identifiers[ id = touches[ --i ].identifier ] ) {
          if ( unset ) {
            that.cancel();
            unset = true;
          }

          identifiers[ id ] = false;
        }
      }
    };

    var resize = function ( event ) {
      /** We'll call this function below. */
      if ( event ) {
        renderer.fullwindow();
      }

      touch_zone = GetTouchZone(
        options.touch_zone,
        renderer.width,
        renderer.height );

      that.x = foo( options.x, renderer.width );
      that.y = foo( options.y, renderer.height );
      that.cancel();
    };

    resize();

    _( window )
      .on( 'touchstart', touchstart )
      .on( 'touchmove', touchmove )
      .on( 'touchend', touchend )
      .on( 'resize', resize );
  };

  Stick.prototype = {
    show: function () {
      this.renderer
        .restore()
        .clear()
        .save()
        .setTransform( 1, 0, 0, 1, this.start[ 0 ], this.start[ 1 ] )
        .stroke( this.colors[ this.state ] )
        .polygon( 0, 0, BIG_R, 8 )
        .polygon( this.location[ 0 ], this.location[ 1 ], SMALL_R, 8 );

      this.redraw = false;
      return this;
    },

    value: function () {
      if ( this._value == null ) {
        this._value = this.location.mag() / BIG_R;
      }

      return this._value;
    },

    angle: function () {
      if ( this._angle == null ) {
        this._angle = this.location.angle();
      }

      return this._angle;
    },

    cancel: function () {
      this.location.set( 0, 0 );
      this.start.set( this.x, this.y );
      this.state = 0;
      this.redraw = true;
      this._angle = this._value = null;
      this.__identifiers.length = 0;
      return this;
    },

    colors: [
      v6.rgba( 255, 0.3 ),
      v6.rgba( 255, 0.5 ),
      v6.rgba( 255, 0.7 )
    ],

    state: 0,
    redraw: true,
    constructor: Stick
  };
}

var Update = function ( dt ) {
  if ( object.Intersects( exit ) ) {
    return Win();
  }

  object
    .Move( 0, dt )
    .Move( 1, dt )
    .velocity.mult( 0.975 );

  if ( stick.state === 2 ) {
    object.velocity
      .set( stick.value() * object.speed, 0 )
      .rotate( stick.angle() );
  }

  camera
    .lookAt( object.location )
    .update();
};

var Render = function () {
  var i = walls.length - 1;

  renderer
    .restore()
    .clear()
    .save()
    .setTransformFromCamera( camera );

  object.Render();

  for ( ; i >= 0; --i ) {
    walls[ i ].Render();
  }

  if ( touchable && stick.redraw ) {
    stick.show();
  }
};

var MakeMapFromMaze = function ( maze, x, y ) {
  var map = Array( y * 2 + 1 ),
      w = x * 2 + 1,
      j, i, row, cell;

  map[ 0 ] = row = Array( w );

  for ( i = w - 1; i >= 0; --i ) {
    row[ i ] = bazfoo[ 0 ];
  }

  for ( j = 0; j < y; ++j ) {
    map[ j * 2 + 1 ] = Array( w );
    map[ j * 2 + 2 ] = Array( w );
    row = maze[ j ];

    for ( i = x - 1; i >= 0; --i ) {
      map[ j * 2 + 2 ][ i * 2 ] =
        map[ j * 2 + 2 ][ i * 2 + 2 ] = bazfoo[ 0 ];
      cell = row[ i ];
      map[ j * 2     ][ i * 2 + 1 ] = bazfoo[ cell[ 0 ] ];
      map[ j * 2 + 1 ][ i * 2 + 2 ] = bazfoo[ cell[ 1 ] ];
      map[ j * 2 + 2 ][ i * 2 + 1 ] = bazfoo[ cell[ 2 ] ];
      map[ j * 2 + 1 ][ i * 2     ] = bazfoo[ cell[ 3 ] ];
      map[ j * 2 + 1 ][ i * 2 + 1 ] = bazfoo[ 1 ];
    }
  }

  return map;
};

var MakeWorldFromMap = function ( map ) {
  var j = map.length - 1,
      i, x, y, ch, row;

  walls.length = 0;

  for ( ; j >= 0; --j ) {
    i = ( row = map[ j ] ).length - 1;
    y = j * SIZE;

    for ( ; i >= 0; --i ) {
      x = i * SIZE;

      if ( ( ch = row[ i ] ) === OBJECTS.WALL ) {
        walls.push( new Wall( x, y, SIZE, SIZE ) );
      } else if ( ch === OBJECTS.PLAYER ) {
        object = new Circle( x + SIZE * 0.5, y + SIZE * 0.5, SIZE * 0.25 );
      } else if ( ch === OBJECTS.EXIT ) {
        exit = new Wall( x, y, SIZE, SIZE );
      }
    }
  }
};

var Win = function () {
  if ( level < final_level ) {
    ++level;
  }

  Reset();
};

var Reset = function () {
  var x = 5 * level,
      y = 5 * level,
      // generate random maze and make map with it
      map = MakeMapFromMaze( newMaze( x, y ), x, y );

  // the player
  map[ 1 ][ 1 ] = OBJECTS.PLAYER;
  // the exit
  map[ y * 2 - 1 ][ x * 2 ] = OBJECTS.EXIT;
  // final step with the world
  MakeWorldFromMap( map );

  ui.show();

  window.setTimeout( function () {
    ui.hide();
  }, 1000 );
};

var Restart = function () {
  ticker.stop();
  // fix joystick
  stick.cancel();

  // built-in `confirm` only temporary solution
  if ( window.confirm( 'Do you really want to restart this level?' ) ) {
    // fix animation using `setTimeout`
    window.setTimeout( function () {
      Reset();

      ticker
        .clear( true )
        .tick();
    }, 1 );
  } else {
    ticker
      .clear()
      .tick();
  }
};

var Resize = function () {
  renderer.fullwindow();
  camera.offset.set(
    renderer.width * 0.5,
    renderer.height * 0.5 );
};

var ui = {
  init: function () {
    _.forEachRight( [
      '#restart',
      '#overlay',
      '#level'
    ], function ( selector ) {
      this[ selector ] = _( selector );
    }, this );

    // as always, i have complicated everything very much
    // i hate default :focus and :hover behavior
    var touchstart = function ( event ) {
      // to fix firefox
      if ( touchable ) {
        event = event.targetTouches[ 0 ];
        this.touched = true;
        this.touch.set( event.clientX, event.clientY );
      }

      _( this ).addClass( 'active' );
    };

    var touchend = function () {
      if ( touchable ) {
        if ( this.touched ) {
          Restart();
        }

        this.touched = false;
      } else {
        Restart();
      }

      _( this ).removeClass( 'active' );
    };

    if ( touchable ) {
      this[ '#restart' ][ 0 ].touch = v6.vec2();

      var touchmove = function ( event ) {
        event = event.targetTouches[ 0 ];

        // fix firefox `touchmove = alert`
        if ( event.clientX !== this.touch[ 0 ] ||
             event.clientY !== this.touch[ 1 ] )
        {
          this.touched = false;
          touchend.call( this );
        }
      };

      this[ '#restart' ]
        .on( 'touchstart', touchstart )
        .on( 'touchmove', touchmove )
        .on( 'touchend', touchend );
    }
  },

  show: function () {
    this[ '#level' ].text( level );
    this[ '#overlay' ].addClass( 'active' );
  },

  hide: function () {
    this[ '#overlay' ].removeClass( 'active' );
  }
};

var walls = [],
    object, exit, renderer, stick, camera, ticker;

_( function () {
  renderer = v6( {
    mode: mode
  } )
    .noFill()
    .stroke( 255 )
    .lineWidth( 1.5 );

  renderer.canvas.style.background =
    document.body.style.background = '#000';

  camera = renderer.camera( {
    speed: [
      CAMERA_SPEED,
      CAMERA_SPEED
    ],

    scale: [
      CAMERA_ZOOM
    ]
  } );

  if ( touchable ) {
    stick = new Stick( {
      touch_zone: [
        0, 0, 1, 1
      ],

      x: 0.5,
      y: 0.5
    } );
  }

  _( window ).resize( Resize );
  ui.init();
  Reset();
  ticker = v6.ticker( Update, Render ).tick();
} );

} )( this );
