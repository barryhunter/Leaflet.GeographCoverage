/**
 * $Project: GeoGraph $
 * $Id: Leaflet.GeographClickLayer.js 3657 2007-08-09 18:12:09Z barry $
 * 
 * GeoGraph geographic photo archive project
 * This file copyright (C) 2018  Barry Hunter (geo@barryhunter.co.uk)
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/* Adds a click event to map to show Geograph Images, not technically a layer, but this seems nice way to make it self contained!
* note also sets a mouse move event, and the grid-ref is reused from that!
* 
* Prerequisites:
*   jQuery (around 1.8)
*   geotools2
*/

L.GeographClickLayer = L.FeatureGroup.extend({
	options: {
		endpoint: "https://api.geograph.org.uk/api-facetql.php",
		bounds: L.latLngBounds(L.latLng(49.863788, -13.688451), L.latLng(60.860395, 1.795260)), 
		minZoom: 13, maxZoom: 17,
		query: '',
		user_id: null
	},

	initialize: function (options) {
		L.setOptions(this, options);
		L.FeatureGroup.prototype.initialize.call(this);
	},

        onAdd: function (map) {
            map.on('click', this.clickEvent, this);
            map.on('mousemove', this.moveEvent, this);
            this._map = map;
	    this.appendToDOM();
        },
        onRemove: function (map) {
            map.off('click', this.clickEvent, this);
            map.off('mousemove', this.moveEvent, this);
	    this._map = null;
        },

	clickEvent: function(e) {
		if (this._grid && this._grid.status && this._grid.status == 'OK') {
			var ll = this._gr.replace(/ /g,'');
		} else {
                	var ll = e.latlng.lat.toFixed(6)+","+e.latlng.lng.toFixed(6);
		}

                var p1 = this._map.containerPointToLatLng([window.innerWidth/2, window.innerHeight/2]);
                var p2 = this._map.containerPointToLatLng([(window.innerWidth/2) + 40, (window.innerHeight/2) + 40]);
                var dist = p1.distanceTo(p2).toFixed(0);

                //window.open("http://www.geograph.org.uk/browser/#!/loc="+ll+"/dist="+dist+"/display=plus/sort=spread",'browserthumbs');
		this.displayThumbs(e.latlng.lat.toFixed(6),e.latlng.lng.toFixed(6),dist);
        },

	moveEvent: function(e) {
		var wgs84=new GT_WGS84();
		wgs84.setDegrees(e.latlng.lat,e.latlng.lng);

		if (wgs84.isIreland2())
		        this._grid=wgs84.getIrish(true);
		else
		        this._grid=wgs84.getOSGB();

		if (this._grid && this._grid.status && this._grid.status == 'OK') {
			var z = this._map.getZoom();
			if (z > 15) precision = 5;
			else if (z > 12) precision = 4;
			else if (z > 9) precision = 3;
			else precision = 2;

			this._gr = this._grid.getGridRef(precision);
			if (document.getElementById('gridref'))
				document.getElementById('gridref').innerText = this._gr;
		};
	},

///////////////////////////////////////////////////

	displayThumbs: function(lat,lng,radius) {

		    var data = {
		      select: "id,title,grid_reference,realname,hash,scenti,wgs84_lat,wgs84_long",
		      match: this.options.query,
		      geo: lat+","+lng+","+radius,
		      order: "sequence ASC",
		      option: 'ranker=none',
		      limit: 10
		    };

                if (this._grid && this._grid.status && this._grid.status == 'OK') {
    			var gridref = this._gr;
		} else {
			var gridref = lat+','+lng;
		}

		var size = 'small';
		if (window.innerWidth>800 && window.innerHeight > 700)
			size = 'med';

		$('#lightback').fadeIn('fast');

		$('#thumbs').html('<div style="height:260px">Loading thumbnails.... please wait.</div>');

		var that = this;    
		$.getJSON(
		      this.options.endpoint,
		      data,
		      function(data) {
		        if (data && data.rows) {
			  $('#lightfront').show();
		          $('#thumbs').empty();
	
        		  $.each(data.rows,function(index,value) {
		            value.thumbnail = that.getGeographUrl(value.id, value.hash, size);
		            hover = ''; dist = '';
		            // if (value.attrs.wgs84_lat && value.attrs.scenti != 1000000000 && value.attrs.scenti != 2000000000) {
 		            //   hover = ' onmouseover="hoverpin('+value.id+','+rad2deg(value.attrs.wgs84_lat)+','+rad2deg(value.attrs.wgs84_long)+');" onmouseout="hoverout('+value.id+');"';
			    // }
			    if (value.scenti != 1000000000 && value.scenti != 2000000000) {
		              dist = 'Dist: '+(value.geodist/1000).toFixed(1)+'km';
		            }
		            value.html = '<div class="thumb'+size+'">'+dist+'<br><a target=newinw href="/photo/'+value.id+'" title="'+value.grid_reference+' : '+value.title+' by '+value.realname+'"'+hover+'><img src="'+value.thumbnail+'"/></a></div>';
            
		            $('#thumbs').append(value.html);            
		          });

			  if (data.meta && data.meta.total_found) {
			    gridref = encodeURIComponent(gridref.replace(/ /g,''));
		            $('#thumbs').append('<div style="float:left;padding:5px;background-color:#eee;width:240px;text-align:center">'+data.rows.length+
				' of '+data.meta.total_found+' images within '+(radius/1000).toFixed(2)+'km. <br/><br/>'+
				'<b><a target=newinw href="/near/'+gridref+'">More Images</a></b>, '+
				'<a target=newinw href="/browser/#!/loc='+gridref+'/dist='+radius+'/sort=spread">Image Browser</a><br/>'+
				'<a target=newinw href="/gridref/'+gridref+'">Grid Square Page for '+gridref+'</a></div>');
		          }
		        } else {
				$('body').append('<div id=noresults>No results within '+(radius/1000).toFixed(2)+'km of '+gridref+'.<br>Tip: Try clicking closer to center of a visible thumbnail.</div>');

				setTimeout(function() {
					$("#noresults").fadeOut('slow', function(){
					  $(this).remove();
					});
				}, 2500);

				$('#lightback').fadeOut('fast');
		        }
		      }
	    	);
	},

	rad2deg: function(angle) {
	    // Converts the radian number to the equivalent number in degrees  
	    // 
	    // version: 1109.2015
	    // discuss at: http://phpjs.org/functions/rad2deg
	    // +   original by: Enrique Gonzalez
	    // +      improved by: Brett Zamir (http://brett-zamir.me)
	    // *	     example 1: rad2deg(3.141592653589793);
	    // *     returns 1: 180
	    return angle * 57.29577951308232; // angle / Math.PI * 180
	},

	getGeographUrl: function(gridimage_id, hash, size) {

	        yz=this.zeroFill(Math.floor(gridimage_id/1000000),2);
	        ab=this.zeroFill(Math.floor((gridimage_id%1000000)/10000),2);
        	cd=this.zeroFill(Math.floor((gridimage_id%10000)/100),2);
	        abcdef=this.zeroFill(gridimage_id,6);

	        if (yz == '00') {
        	        fullpath="/photos/"+ab+"/"+cd+"/"+abcdef+"_"+hash;
	        } else {
        	        fullpath="/geophotos/"+yz+"/"+ab+"/"+cd+"/"+abcdef+"_"+hash;
	        }

        	switch(size) {
                	case 'full': return "https://s0.geograph.org.uk"+fullpath+".jpg"; break;
	                case 'med': return "https://s"+(gridimage_id%4)+".geograph.org.uk"+fullpath+"_213x160.jpg"; break;
        	        case 'small':
                	default: return "https://s"+(gridimage_id%4)+".geograph.org.uk"+fullpath+"_120x120.jpg";
	        }
	},

	zeroFill: function(number, width) {
	        width -= number.toString().length;
	        if (width > 0) {
        	        return new Array(width + (/\./.test(number)?2:1)).join('0') + number;
	        }
        	return number + "";
	},

	closeLight: function() {
		$('#lightfront').hide();
		$('#lightback').fadeOut('fast');
		return false;
	},
	
	appendToDOM: function() {
		if ($('body lightback').length == 0)
		$('body').append('<div id="lightback" style="display:none;" onclick="return L.GeographClickLayer.prototype.closeLight()"></div>'+
		'<div id="lightfront" style="display:none;">'+
		'	<div id="close">'+
                '		<a href=# onclick="return L.GeographClickLayer.prototype.closeLight()">Close</a>'+
                '	</div>'+
                '	<div id="thumbs"></div>'+
                '</div>');
		//TODO - make this more 'jQueryesq'
	}
});

L.geographClickLayer = function (options) {
	return new L.GeographClickLayer(options);
};
	
