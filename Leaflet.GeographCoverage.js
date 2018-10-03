/**
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

/* 
* Plots Geograph coverage circles, aligned to grid. 
* src: https://github.com/barryhunter/Leaflet.GeographCoverage
* 
* Prerequisites:
*   https://github.com/ded/reqwest
*
* Minimal example, including a dynamic grid 
*   see: https://www.geograph.org/leaflet/GeographCoverage.html
*   
* Clearly inspired and draws ideas from:
*   https://github.com/MatthewBarker/leaflet-wikipedia/
*   https://github.com/turban/Leaflet.Photo/
**/


L.GeographCoverage = L.FeatureGroup.extend({
	options: {
		bounds: L.latLngBounds(L.latLng(49.863788, -13.688451), L.latLng(60.860395, 1.795260)), 
		minZoom: 13, maxZoom: 17,
		squareScale: 'square',
		query: '',
		user_id: null
	},

	initialize: function (options) {
		L.setOptions(this, options);
		L.FeatureGroup.prototype.initialize.call(this);

		this._labels = [];
		this._circles = [];
	},

	//stolen from https://github.com/MatthewBarker/leaflet-wikipedia/blob/master/source/leaflet-wikipedia.js
        /**
            Store a reference to the map and call the requestData() method.
            @private
        */
        onAdd: function (map) {
            map.on('moveend', this.requestData, this);
            this._map = map;
            this.requestData();
        },
        /**
            Remove the 'moveend' event listener and clear all the markers.
            @private
        */
        onRemove: function (map) {
            map.off('moveend', this.requestData, this);
            this.clearLayers();
            this._circles = [];
            this._labels = [];
	    this.outputStatus('');
        },
        /**
            Send a query request for JSONP data.
            @private
        */
        requestData: function () {
            var zoom = this._map.getZoom(),
            origin = this._map.getCenter(),
	    bounds = map.getBounds(),
	    self = this;
	    var data = {
		olbounds: bounds.toBBoxString(),
		q: this.options.query,
		user_id: this.options.user_id
	    };

		if (this.options.squareScale == 'centisquare' || zoom >= 15) {
			var url = "https://www.geograph.org.uk/stuff/squares-centi.json.php";

			if (typeof getMyriadLetter != 'undefined') {
				myriads = new Array();
				var vgr = getMyriadLetter( bounds.getSouthWest() );
				if (vgr && vgr.length >0) myriads.push(vgr);
				vgr = getMyriadLetter( bounds.getNorthEast() );
				if (vgr && vgr.length >0) myriads.push(vgr);
				vgr = getMyriadLetter( bounds.getNorthWest() );
				if (vgr && vgr.length >0) myriads.push(vgr);
				vgr = getMyriadLetter( bounds.getSouthEast() );
				if (vgr && vgr.length >0) myriads.push(vgr);
				data.myriads = myriads.join(',');
			}

			//if (document.theForm.customised[1].checked)
			//	url = url + '&user_id='+document.theForm.user_id.value;

		} else {
			var url = "https://www.geograph.org.uk/stuff/squares.json.php";
			myriads = new Array();
		}

            if (zoom >= this.options.minZoom && zoom <= this.options.maxZoom) {
                reqwest({
                    url: url+"?callback=?",
                    data: data,
			 type: 'jsonp',
                    success: function (response) { self.parseData(response); }
                });
            } else {
                this.clearLayers();
            this._circles = [];
            this._labels = [];
  	    this.outputStatus('');
            }
	},

	outputStatus: function (text) {
		document.getElementById('message').innerHTML = text;
	},

	/**
            Parse the response data and call the addMarker() method for each result.
            @param {Object} response - JSON data
            @private
        */
        parseData: function (data) {

		if (data.error && data.error.length > 0) {
			this.outputStatus(data.error);
			running = false;
			prevZoom = this._map.getZoom();
			return;
		}

		//flag all current markers as old
			for (i in this._labels) 
				if (this._labels[i] != null) {
					this._labels[i].old = true;
				}

		        var loaded = 0;

		this.outputStatus("Adding "+(data.markers.length)+" Squares...");

			for (var i = 0; i < data.markers.length; i++) {
				id = data.markers[i].gr;
				if (this._labels[id] && this._labels[id] != null) {
			            this._labels[id].old = false;
                                } else {
  					var labelPos = [parseFloat(data.markers[i].lat),parseFloat(data.markers[i].lng)];

					//this._circles[id] = L.circleMarker(labelPos, {radius: 10});

					this._labels[id] = L.marker(labelPos, {
			                        icon: L.divIcon({ 
							iconSize: [20,20],
							html: data.markers[i].c.toString(),
							className: data.markers[i].r?'mynumbern':'mynumbert'
						}),
			                        title: id
			                });

					//this.addLayer(this._circles[id]);
					this.addLayer(this._labels[id]);
			        }
		                loaded=loaded+1;
		        }


		this.outputStatus("Removing Old Squares...");
			for (i in this._labels) 
				if (this._labels[i] != null) 
					if (this._labels[i].old == true) {
						//this.removeLayer(this._circles[i]);
						this.removeLayer(this._labels[i]);
						this._labels[i] = null;		
						this._circles[i] = null;		
					}

			
			
			if (data.count && data.count.length > 0) {
				if (data.markers.length == data.count) {
					this.outputStatus("Finished, showing "+data.markers.length+" squares.");
				} else {
					this.outputStatus("Finished, showing "+data.markers.length+" of "+data.count+" squares.");
				}
			} else {
				this.outputStatus("Finished, showing "+data.markers.length+" squares.");
			}
			running = false;

        },

});

L.geographCoverage = function (options) {
	return new L.GeographCoverage(options);
};

