(window.webpackJsonp=window.webpackJsonp||[]).push([[19],{862:function(t,e,o){"use strict";o.r(e);o(6),o(3),o(2),o(1),o(5);var r=o(0),c=o(30),l=o(363),n=o(354),d=o(355),h=o(356),v=o(412),f=o(358),m=o(359),w=o(361);function C(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(object);t&&(o=o.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,o)}return e}var _={components:{Header:n.a,Footer:d.a,Breadcrumbs:h.a,productBox1:l.a,sidebar:v.a,quickviewModel:f.a,compareModel:m.a,cartModel:w.a},data:function(){return{bannerimagepath:o(385),col2:!1,col3:!1,col4:!0,col6:!1,listview:!1,priceArray:[],allfilters:[],items:[],current:1,paginate:12,paginateRange:3,pages:[],paginates:"",showquickviewmodel:!1,showcomparemodal:!1,showcartmodal:!1,quickviewproduct:{},comapreproduct:{},cartproduct:{},dismissSecs:5,dismissCountDown:0,sidebarPopup:!1}},computed:function(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?C(Object(source),!0).forEach((function(e){Object(r.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):C(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}({},Object(c.b)({filterProduct:"filter/filterProducts",tags:"filter/setTags"})),mounted:function(){this.updatePaginate(1)},methods:{sidebar_popup:function(){this.sidebarPopup=!this.sidebarPopup},onChangeSort:function(t){this.$store.dispatch("filter/sortProducts",t.target.value)},gridView:function(){this.col4=!0,this.col2=!1,this.col3=!1,this.col6=!1,this.listview=!1},listView:function(){this.listview=!0,this.col4=!1,this.col2=!1,this.col3=!1,this.col6=!1},grid2:function(){this.col2=!0,this.col3=!1,this.col4=!1,this.col6=!1,this.listview=!1},grid3:function(){this.col3=!0,this.col2=!1,this.col4=!1,this.col6=!1,this.listview=!1},grid4:function(){this.col4=!0,this.col2=!1,this.col3=!1,this.col6=!1,this.listview=!1},grid6:function(){this.col6=!0,this.col2=!1,this.col3=!1,this.col4=!1,this.listview=!1},removeTags:function(t){this.allfilters.splice(this.allfilters.indexOf(t),1)},removeAllTags:function(){this.allfilters.splice(0,this.allfilters.length)},getCategoryFilter:function(){this.updatePaginate(1),this.$store.dispatch("filter/getCategoryFilter",this.$route.params.id)},allfilter:function(t){this.allfilters=t,this.$store.dispatch("filter/setTags",t),this.getPaginate(),this.updatePaginate(1)},pricefilterArray:function(t){this.getCategoryFilter(),this.$store.dispatch("filter/priceFilter",t),this.getPaginate(),this.updatePaginate(1)},getPaginate:function(){this.paginates=Math.round(this.filterProduct.length/this.paginate),this.pages=[];for(var i=0;i<this.paginates;i++)this.pages.push(i+1)},setPaginate:function(i){return 1===this.current?i<this.paginate:i>=this.paginate*(this.current-1)&&i<this.current*this.paginate},updatePaginate:function(i){this.current=i;var t=0,e=0;this.current<this.paginateRange-1?e=(t=1)+this.paginateRange-1:(t=this.current-1,e=this.current+1),t<1&&(t=1),e>this.paginates&&(e=this.paginates),this.pages=[];for(var o=t;o<=e;o++)this.pages.push(o);return this.pages},alert:function(t){this.dismissCountDown=t},showQuickview:function(t,e){this.showquickviewmodel=t,this.quickviewproduct=e},showCoampre:function(t,e){this.showcomparemodal=t,this.comapreproduct=e},closeCompareModal:function(t){this.showcomparemodal=t},showCart:function(t,e){this.showcartmodal=t,this.cartproduct=e},closeCartModal:function(t){this.showcartmodal=t}}},y=o(35),component=Object(y.a)(_,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("Header"),t._v(" "),r("Breadcrumbs",{attrs:{title:"collection"}}),t._v(" "),r("section",{staticClass:"section-b-space ratio_asos"},[r("div",{staticClass:"collection-wrapper"},[r("div",{staticClass:"container"},[r("div",{staticClass:"row"},[r("div",{staticClass:"collection-content col"},[r("div",{staticClass:"page-main-content"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-sm-12"},[r("div",{staticClass:"top-banner-wrapper"},[r("a",{attrs:{href:"#"}},[r("img",{staticClass:"img-fluid",attrs:{src:o(383),alt:""}})]),t._v(" "),t._m(0)]),t._v(" "),r("ul",{staticClass:"product-filter-tags"},[t._l(t.allfilters,(function(e,o){return r("li",{key:o,staticClass:"mr-1"},[r("a",{staticClass:"filter_tag",attrs:{href:"javascript:void(0)"}},[t._v(t._s(e)),r("i",{staticClass:"ti-close",on:{click:function(o){return t.removeTags(e)}}})])])})),t._v(" "),t.allfilters.length>0?r("li",{staticClass:"clear_filter"},[r("a",{staticClass:"clear_filter",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.removeAllTags()}}},[t._v("Clear all")])]):t._e()],2),t._v(" "),r("div",{staticClass:"collection-product-wrapper"},[r("div",{staticClass:"product-top-filter"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-12"},[r("div",{staticClass:"popup-filter"},[r("div",{staticClass:"sidebar-popup",on:{click:function(e){return t.sidebar_popup()}}},[r("a",{staticClass:"popup-btn"},[t._v("filter products")])]),t._v(" "),r("div",{staticClass:"open-popup",class:{open:t.sidebarPopup}},[r("div",{staticClass:"collection-filter"},[r("sidebar",{on:{allFilters:t.allfilter,priceVal:t.pricefilterArray,categoryfilter:t.getCategoryFilter}})],1)]),t._v(" "),r("div",{staticClass:"collection-view"},[r("ul",[r("li",{on:{click:function(e){return t.gridView()}}},[r("i",{staticClass:"fa fa-th grid-layout-view"})]),t._v(" "),r("li",{on:{click:function(e){return t.listView()}}},[r("i",{staticClass:"fa fa-list-ul list-layout-view"})])])]),t._v(" "),r("div",{staticClass:"collection-grid-view"},[r("ul",[r("li",[r("img",{staticClass:"product-2-layout-view",attrs:{src:o(389)},on:{click:function(e){return t.grid2()}}})]),t._v(" "),r("li",[r("img",{staticClass:"product-3-layout-view",attrs:{src:o(390)},on:{click:function(e){return t.grid3()}}})]),t._v(" "),r("li",[r("img",{staticClass:"product-4-layout-view",attrs:{src:o(391)},on:{click:function(e){return t.grid4()}}})]),t._v(" "),r("li",[r("img",{staticClass:"product-6-layout-view",attrs:{src:o(392)},on:{click:function(e){return t.grid6()}}})])])]),t._v(" "),r("div",{staticClass:"product-page-filter"},[r("select",{on:{change:function(e){return t.onChangeSort(e)}}},[r("option",{attrs:{value:"all"}},[t._v("Sorting Items")]),t._v(" "),r("option",{attrs:{value:"a-z"}},[t._v("Alphabetically, A-Z")]),t._v(" "),r("option",{attrs:{value:"z-a"}},[t._v("Alphabetically, Z-A")]),t._v(" "),r("option",{attrs:{value:"low"}},[t._v("price, low to high")]),t._v(" "),r("option",{attrs:{value:"high"}},[t._v("price, high to low")])])])])])])]),t._v(" "),r("div",{staticClass:"product-wrapper-grid"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-sm-12"},[0==t.filterProduct.length?r("div",{staticClass:"text-center section-t-space section-b-space"},[r("img",{staticClass:"img-fluid",attrs:{src:o(388),alt:""}}),t._v(" "),r("h3",{staticClass:"mt-3"},[t._v("Sorry! Couldn't find the product you were looking For!!!")]),t._v(" "),r("div",{staticClass:"col-12 mt-3"},[r("nuxt-link",{staticClass:"btn btn-solid",attrs:{to:{path:"/"}}},[t._v("continue shopping")])],1)]):t._e()]),t._v(" "),t._l(t.filterProduct,(function(e,o){return r("div",{directives:[{name:"show",rawName:"v-show",value:t.setPaginate(o),expression:"setPaginate(index)"}],key:o,staticClass:"col-grid-box",class:{"col-lg-3 col-md-4 col-sm-6":1==t.col4,"col-lg-4 col-sm-6":1==t.col3,"col-sm-6":1==t.col2,"col-lg-2 col-md-4 col-sm-6":1==t.col6,"col-lg-12":1==t.listview}},[r("div",{staticClass:"product-box"},[r("productBox1",{attrs:{product:e,index:o},on:{opencartmodel:t.showCart,showCompareModal:t.showCoampre,openquickview:t.showQuickview,showalert:t.alert,alertseconds:t.alert}})],1)])}))],2)]),t._v(" "),t.filterProduct.length>this.paginate?r("div",{staticClass:"product-pagination mb-0"},[r("div",{staticClass:"theme-paggination-block"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-xl-6 col-md-6 col-sm-12"},[r("nav",{attrs:{"aria-label":"Page navigation"}},[r("ul",{staticClass:"pagination"},[r("li",{staticClass:"page-item"},[r("a",{staticClass:"page-link",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.updatePaginate(t.current-1)}}},[t._m(1)])]),t._v(" "),t._l(this.pages,(function(e,o){return r("li",{key:o,staticClass:"page-item",class:{active:e==t.current}},[r("a",{staticClass:"page-link",attrs:{href:"javascrip:void(0)"},on:{click:function(o){return o.preventDefault(),t.updatePaginate(e)}}},[t._v(t._s(e))])])})),t._v(" "),r("li",{staticClass:"page-item"},[r("a",{staticClass:"page-link",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.updatePaginate(t.current+1)}}},[t._m(2)])])],2)])]),t._v(" "),r("div",{staticClass:"col-xl-6 col-md-6 col-sm-12"},[r("div",{staticClass:"product-search-count-bottom"},[r("h5",[t._v("Showing Products 1-12 of "+t._s(t.filterProduct.length)+" Result")])])])])])]):t._e()])])])])])])])])]),t._v(" "),r("b-alert",{attrs:{show:t.dismissCountDown,variant:"success"},on:{dismissed:function(e){t.dismissCountDown=0},"dismiss-count-down":t.alert}},[r("p",[t._v("Product Is successfully added to your wishlist.")])]),t._v(" "),r("quickviewModel",{attrs:{openModal:t.showquickviewmodel,productData:t.quickviewproduct}}),t._v(" "),r("compareModel",{attrs:{openCompare:t.showcomparemodal,productData:t.comapreproduct},on:{closeCompare:t.closeCompareModal}}),t._v(" "),r("cartModel",{attrs:{openCart:t.showcartmodal,productData:t.cartproduct,products:t.filterProduct},on:{closeCart:t.closeCartModal}}),t._v(" "),r("Footer")],1)}),[function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"top-banner-content small-section"},[e("h4",[this._v("fashion")]),this._v(" "),e("h5",[this._v("Lorem Ipsum is simply dummy text of the printing and typesetting industry.")]),this._v(" "),e("p",[this._v("Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.")])])},function(){var t=this.$createElement,e=this._self._c||t;return e("span",{attrs:{"aria-hidden":"true"}},[e("i",{staticClass:"fa fa-chevron-left",attrs:{"aria-hidden":"true"}})])},function(){var t=this.$createElement,e=this._self._c||t;return e("span",{attrs:{"aria-hidden":"true"}},[e("i",{staticClass:"fa fa-chevron-right",attrs:{"aria-hidden":"true"}})])}],!1,null,null,null);e.default=component.exports}}]);