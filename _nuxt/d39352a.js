(window.webpackJsonp=window.webpackJsonp||[]).push([[206],{401:function(t,n,e){"use strict";e(431);var r={mounted:function(){var t=this;window.setInterval((function(){t.now=Math.trunc((new Date).getTime()/1e3)}),1e3)},props:["date"],data:function(){return{timerdate:Math.trunc(new Date(this.date).getTime()/1e3),now:Math.trunc((new Date).getTime()/1e3)}},computed:{seconds:function(){return(this.timerdate-this.now)%60},minutes:function(){return Math.trunc((this.timerdate-this.now)/60)%60},hours:function(){return Math.trunc((this.timerdate-this.now)/60/60)%24},days:function(){return Math.trunc((this.timerdate-this.now)/60/60/24)}}},c=e(35),component=Object(c.a)(r,(function(){var t=this,n=t.$createElement,e=t._self._c||n;return e("div",[e("div",{staticClass:"timer"},[e("p",{attrs:{id:"demo"}},[e("span",[e("span",{staticClass:"timer-num"},[t._v(t._s(t.days))]),t._v(" "),e("span",{staticClass:"padding-l"},[t._v(":")]),t._v(" "),e("span",{staticClass:"timer-cal"},[t._v("Days")])]),t._v(" "),e("span",[e("span",{staticClass:"timer-num"},[t._v(t._s(t.hours))]),t._v(" "),e("span",{staticClass:"padding-l"},[t._v(":")]),t._v(" "),e("span",{staticClass:"timer-cal"},[t._v("Hrs")])]),t._v(" "),e("span",[e("span",{staticClass:"timer-num"},[t._v(t._s(t.minutes))]),t._v(" "),e("span",{staticClass:"padding-l"},[t._v(":")]),t._v(" "),e("span",{staticClass:"timer-cal"},[t._v("Min")])]),t._v(" "),e("span",[e("span",{staticClass:"timer-num"},[t._v(t._s(t.seconds))]),t._v(" "),e("span",{staticClass:"timer-cal"},[t._v("Sec")])])])])])}),[],!1,null,null,null);n.a=component.exports},431:function(t,n,e){var r=e(10);r(r.S,"Math",{trunc:function(t){return(t>0?Math.floor:Math.ceil)(t)}})},699:function(t,n,e){"use strict";e.r(n);var r={data:function(){return{imagepath:e(222),offer_text:"Save <span>30% off</span> Digital Watch"}},components:{Countdown:e(401).a}},c=e(35),component=Object(c.a)(r,(function(){var t=this.$createElement,n=this._self._c||t;return n("div",[n("section",[n("div",{staticClass:"container"},[n("div",{staticClass:"row banner-timer",style:{"background-image":"url("+this.imagepath+")"}},[n("div",{staticClass:"col-md-6"},[n("div",{staticClass:"banner-text"},[n("h2",{domProps:{innerHTML:this._s(this.offer_text)}})])]),this._v(" "),n("div",{staticClass:"col-md-6"},[n("div",{staticClass:"timer-box"},[n("countdown",{attrs:{date:"December 20, 2020"}})],1)])])])])])}),[],!1,null,null,null);n.default=component.exports}}]);