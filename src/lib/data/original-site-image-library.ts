import { ImageAsset } from "@/lib/api/api-contract";
import { assetPath } from "@/lib/assets";

const originalSiteImages = {
  "267": [
    {
      "url": "/assets/original-site/images-202605-source_img-267_P_1778653360648.JPG",
      "alt": "Base Cabinet 267"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-267_P_1778653370816.JPG",
      "alt": "Base Cabinet 267 view 2"
    }
  ],
  "268": [
    {
      "url": "/assets/original-site/images-202604-source_img-268_P_1777096728296.JPG",
      "alt": "Wall Cabinet 268"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-268_P_1778653493185.JPG",
      "alt": "Wall Cabinet 268 view 2"
    }
  ],
  "269": [
    {
      "url": "/assets/original-site/images-202605-source_img-269_P_1778653714057.JPG",
      "alt": "Base Cabinet 269"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-269_P_1778653752342.JPG",
      "alt": "Base Cabinet 269 view 2"
    }
  ],
  "270": [
    {
      "url": "/assets/original-site/images-202604-source_img-270_P_1777097002257.JPG",
      "alt": "Wall Cabinet 270"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-270_P_1778654645059.JPG",
      "alt": "Wall Cabinet 270 view 2"
    }
  ],
  "271": [
    {
      "url": "/assets/original-site/images-202604-source_img-271_P_1777097087747.JPG",
      "alt": "Base Cabinet 271"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-271_P_1778800131701.JPG",
      "alt": "Base Cabinet 271 view 2"
    }
  ],
  "272": [
    {
      "url": "/assets/original-site/images-202604-source_img-272_P_1777097234382.JPG",
      "alt": "Wall Cabinet 272"
    },
    {
      "url": "/assets/original-site/images-202604-source_img-272_P_1777097242182.JPG",
      "alt": "Wall Cabinet 272 view 2"
    }
  ],
  "273": [
    {
      "url": "/assets/original-site/images-202604-source_img-273_P_1777099778200.JPG",
      "alt": "Base Cabinet 273"
    },
    {
      "url": "/assets/original-site/images-202604-source_img-273_P_1777099859307.JPG",
      "alt": "Base Cabinet 273 view 2"
    }
  ],
  "274": [
    {
      "url": "/assets/original-site/images-202604-source_img-274_P_1777101332931.JPG",
      "alt": "Wall Cabinet 274"
    },
    {
      "url": "/assets/original-site/images-202604-source_img-274_P_1777101342686.JPG",
      "alt": "Wall Cabinet 274 view 2"
    }
  ],
  "275": [
    {
      "url": "/assets/original-site/images-202604-source_img-275_P_1777102224663.JPG",
      "alt": "Base Cabinet 275"
    },
    {
      "url": "/assets/original-site/images-202604-source_img-275_P_1777102256561.JPG",
      "alt": "Base Cabinet 275 view 2"
    }
  ],
  "276": [
    {
      "url": "/assets/original-site/images-202604-source_img-276_P_1777101416916.JPG",
      "alt": "Wall Cabinet 276"
    },
    {
      "url": "/assets/original-site/images-202604-source_img-276_P_1777101474743.JPG",
      "alt": "Wall Cabinet 276 view 2"
    }
  ],
  "277": [
    {
      "url": "/assets/original-site/images-202604-source_img-277_P_1777102457319.JPG",
      "alt": "Base Cabinet 277"
    },
    {
      "url": "/assets/original-site/images-202604-source_img-277_P_1777102487716.JPG",
      "alt": "Base Cabinet 277 view 2"
    }
  ],
  "278": [
    {
      "url": "/assets/original-site/images-202604-source_img-278_P_1777102575820.JPG",
      "alt": "Wall Cabinet 278"
    },
    {
      "url": "/assets/original-site/images-202604-source_img-278_P_1777102617896.JPG",
      "alt": "Wall Cabinet 278 view 2"
    }
  ],
  "279": [
    {
      "url": "/assets/original-site/images-202604-source_img-279_P_1777102729104.JPG",
      "alt": "Base Cabinet 279"
    },
    {
      "url": "/assets/original-site/images-202604-source_img-279_P_1777102768794.JPG",
      "alt": "Base Cabinet 279 view 2"
    }
  ],
  "280": [
    {
      "url": "/assets/original-site/images-202605-source_img-280_P_1778654518777.JPG",
      "alt": "Wall Cabinet 280"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-280_P_1778654559390.JPG",
      "alt": "Wall Cabinet 280 view 2"
    }
  ],
  "281": [
    {
      "url": "/assets/original-site/images-202605-source_img-281_P_1778654984846.JPG",
      "alt": "Base Cabinet 281"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-281_P_1778655020951.JPG",
      "alt": "Base Cabinet 281 view 2"
    }
  ],
  "282": [
    {
      "url": "/assets/original-site/images-202605-source_img-282_P_1778655272892.JPG",
      "alt": "Wall Cabinet 282"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-282_P_1778655281147.JPG",
      "alt": "Wall Cabinet 282 view 2"
    }
  ],
  "283": [
    {
      "url": "/assets/original-site/images-202605-source_img-283_P_1778657459384.JPG",
      "alt": "Base Cabinet 283"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-283_P_1778657495902.JPG",
      "alt": "Base Cabinet 283 view 2"
    }
  ],
  "284": [
    {
      "url": "/assets/original-site/images-202605-source_img-284_P_1778660699360.JPG",
      "alt": "Wall Cabinet 284"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-284_P_1778660732243.JPG",
      "alt": "Wall Cabinet 284 view 2"
    }
  ],
  "285": [
    {
      "url": "/assets/original-site/images-202605-source_img-285_P_1778662593697.JPG",
      "alt": "Base Cabinet 285"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-285_P_1778662649888.JPG",
      "alt": "Base Cabinet 285 view 2"
    }
  ],
  "286": [
    {
      "url": "/assets/original-site/images-202605-source_img-286_P_1778658149049.JPG",
      "alt": "Wall Cabinet 286"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-286_P_1778658186672.JPG",
      "alt": "Wall Cabinet 286 view 2"
    }
  ],
  "287": [
    {
      "url": "/assets/original-site/images-202605-source_img-287_P_1778660843168.JPG",
      "alt": "Base Cabinet 287"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-287_P_1778660874425.JPG",
      "alt": "Base Cabinet 287 view 2"
    }
  ],
  "288": [
    {
      "url": "/assets/original-site/images-202605-source_img-288_P_1778662754548.JPG",
      "alt": "Wall Cabinet 288"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-288_P_1778662810430.JPG",
      "alt": "Wall Cabinet 288 view 2"
    }
  ],
  "289": [
    {
      "url": "/assets/original-site/images-202605-source_img-289_P_1778658255430.JPG",
      "alt": "Base Cabinet 289"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-289_P_1778658309447.JPG",
      "alt": "Base Cabinet 289 view 2"
    }
  ],
  "290": [
    {
      "url": "/assets/original-site/images-202605-source_img-290_P_1778660948270.JPG",
      "alt": "Wall Cabinet 290"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-290_P_1778661012607.JPG",
      "alt": "Wall Cabinet 290 view 2"
    }
  ],
  "291": [
    {
      "url": "/assets/original-site/images-202605-source_img-291_P_1778662856587.JPG",
      "alt": "Base Cabinet 291"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-291_P_1778662913392.JPG",
      "alt": "Base Cabinet 291 view 2"
    }
  ],
  "292": [
    {
      "url": "/assets/original-site/images-202605-source_img-292_P_1778658471216.JPG",
      "alt": "Wall Cabinet 292"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-292_P_1778658534220.JPG",
      "alt": "Wall Cabinet 292 view 2"
    }
  ],
  "293": [
    {
      "url": "/assets/original-site/images-202605-source_img-293_P_1778661194732.JPG",
      "alt": "Base Cabinet 293"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-293_P_1778661248178.JPG",
      "alt": "Base Cabinet 293 view 2"
    }
  ],
  "294": [
    {
      "url": "/assets/original-site/images-202605-source_img-294_P_1778663040471.JPG",
      "alt": "Wall Cabinet 294"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-294_P_1778663093533.JPG",
      "alt": "Wall Cabinet 294 view 2"
    }
  ],
  "295": [
    {
      "url": "/assets/original-site/images-202605-source_img-295_P_1778658681651.JPG",
      "alt": "Base Cabinet 295"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-295_P_1778658721619.JPG",
      "alt": "Base Cabinet 295 view 2"
    }
  ],
  "296": [
    {
      "url": "/assets/original-site/images-202605-source_img-296_P_1778661370253.JPG",
      "alt": "Wall Cabinet 296"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-296_P_1778661429757.JPG",
      "alt": "Wall Cabinet 296 view 2"
    }
  ],
  "297": [
    {
      "url": "/assets/original-site/images-202605-source_img-297_P_1778663228028.JPG",
      "alt": "Base Cabinet 297"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-297_P_1778663282204.JPG",
      "alt": "Base Cabinet 297 view 2"
    }
  ],
  "298": [
    {
      "url": "/assets/original-site/images-202605-source_img-298_P_1778658780054.JPG",
      "alt": "Wall Cabinet 298"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-298_P_1778658815252.JPG",
      "alt": "Wall Cabinet 298 view 2"
    }
  ],
  "299": [
    {
      "url": "/assets/original-site/images-202605-source_img-299_P_1778661491659.JPG",
      "alt": "Base Cabinet 299"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-299_P_1778661560713.JPG",
      "alt": "Base Cabinet 299 view 2"
    }
  ],
  "300": [
    {
      "url": "/assets/original-site/images-202605-source_img-300_P_1778663316002.JPG",
      "alt": "Wall Cabinet 300"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-300_P_1778663370860.JPG",
      "alt": "Wall Cabinet 300 view 2"
    }
  ],
  "301": [
    {
      "url": "/assets/original-site/images-202605-source_img-301_P_1778659172987.JPG",
      "alt": "Base Cabinet 301"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-301_P_1778659227353.JPG",
      "alt": "Base Cabinet 301 view 2"
    }
  ],
  "302": [
    {
      "url": "/assets/original-site/images-202605-source_img-302_P_1778661865911.JPG",
      "alt": "Wall Cabinet 302"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-302_P_1778661921197.JPG",
      "alt": "Wall Cabinet 302 view 2"
    }
  ],
  "303": [
    {
      "url": "/assets/original-site/images-202605-source_img-303_P_1778663600649.JPG",
      "alt": "Base Cabinet 303"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-303_P_1778663650263.JPG",
      "alt": "Base Cabinet 303 view 2"
    }
  ],
  "304": [
    {
      "url": "/assets/original-site/images-202605-source_img-304_P_1778655416877.JPG",
      "alt": "Wall Cabinet 304"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-304_P_1778655428770.JPG",
      "alt": "Wall Cabinet 304 view 2"
    }
  ],
  "305": [
    {
      "url": "/assets/original-site/images-202605-source_img-305_P_1778665545752.JPG",
      "alt": "Base Cabinet 305"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-305_P_1778665599785.JPG",
      "alt": "Base Cabinet 305 view 2"
    }
  ],
  "306": [
    {
      "url": "/assets/original-site/images-202605-source_img-306_P_1778665634104.JPG",
      "alt": "Wall Cabinet 306"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-306_P_1778665697869.JPG",
      "alt": "Wall Cabinet 306 view 2"
    }
  ],
  "307": [
    {
      "url": "/assets/original-site/images-202605-source_img-307_P_1778655521354.JPG",
      "alt": "Base Cabinet 307"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-307_P_1778655529533.JPG",
      "alt": "Base Cabinet 307 view 2"
    }
  ],
  "308": [
    {
      "url": "/assets/original-site/images-202605-source_img-308_P_1778655626624.JPG",
      "alt": "Wall Cabinet 308"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-308_P_1778655683163.JPG",
      "alt": "Wall Cabinet 308 view 2"
    }
  ],
  "309": [
    {
      "url": "/assets/original-site/images-202605-source_img-309_P_1778655748523.JPG",
      "alt": "Base Cabinet 309"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-309_P_1778655785391.JPG",
      "alt": "Base Cabinet 309 view 2"
    }
  ],
  "310": [
    {
      "url": "/assets/original-site/images-202605-source_img-310_P_1778655841820.JPG",
      "alt": "Wall Cabinet 310"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-310_P_1778655880997.JPG",
      "alt": "Wall Cabinet 310 view 2"
    }
  ],
  "311": [
    {
      "url": "/assets/original-site/images-202605-source_img-311_P_1778745724796.JPG",
      "alt": "Base Cabinet 311"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-311_P_1778745785314.JPG",
      "alt": "Base Cabinet 311 view 2"
    }
  ],
  "312": [
    {
      "url": "/assets/original-site/images-202605-source_img-312_P_1778661983814.JPG",
      "alt": "Wall Cabinet 312"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-312_P_1778662046785.JPG",
      "alt": "Wall Cabinet 312 view 2"
    }
  ],
  "313": [
    {
      "url": "/assets/original-site/images-202605-source_img-313_P_1778663686348.JPG",
      "alt": "Base Cabinet 313"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-313_P_1778663740867.JPG",
      "alt": "Base Cabinet 313 view 2"
    }
  ],
  "314": [
    {
      "url": "/assets/original-site/images-202605-source_img-314_P_1778665742114.JPG",
      "alt": "Wall Cabinet 314"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-314_P_1778665797300.JPG",
      "alt": "Wall Cabinet 314 view 2"
    }
  ],
  "315": [
    {
      "url": "/assets/original-site/images-202605-source_img-315_P_1778665833290.JPG",
      "alt": "Base Cabinet 315"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-315_P_1778665883583.JPG",
      "alt": "Base Cabinet 315 view 2"
    }
  ],
  "316": [
    {
      "url": "/assets/original-site/images-202605-source_img-316_P_1778665915402.JPG",
      "alt": "Wall Cabinet 316"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-316_P_1778665991438.JPG",
      "alt": "Wall Cabinet 316 view 2"
    }
  ],
  "317": [
    {
      "url": "/assets/original-site/images-202605-source_img-317_P_1778656026198.JPG",
      "alt": "Base Cabinet 317"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-317_P_1778656061625.JPG",
      "alt": "Base Cabinet 317 view 2"
    }
  ],
  "318": [
    {
      "url": "/assets/original-site/images-202605-source_img-318_P_1778655941473.JPG",
      "alt": "Wall Cabinet 318"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-318_P_1778655976546.JPG",
      "alt": "Wall Cabinet 318 view 2"
    }
  ],
  "319": [
    {
      "url": "/assets/original-site/images-202605-source_img-319_P_1778659567608.JPG",
      "alt": "Base Cabinet 319"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-319_P_1778660239097.JPG",
      "alt": "Base Cabinet 319 view 2"
    }
  ],
  "320": [
    {
      "url": "/assets/original-site/images-202605-source_img-320_P_1778662110981.JPG",
      "alt": "Wall Cabinet 320"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-320_P_1778662163051.JPG",
      "alt": "Wall Cabinet 320 view 2"
    }
  ],
  "321": [
    {
      "url": "/assets/original-site/images-202605-source_img-321_P_1778663854669.JPG",
      "alt": "Base Cabinet 321"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-321_P_1778663908044.JPG",
      "alt": "Base Cabinet 321 view 2"
    }
  ],
  "322": [
    {
      "url": "/assets/original-site/images-202605-source_img-322_P_1778666031981.JPG",
      "alt": "Wall Cabinet 322"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-322_P_1778666081747.JPG",
      "alt": "Wall Cabinet 322 view 2"
    }
  ],
  "323": [
    {
      "url": "/assets/original-site/images-202605-source_img-323_P_1778666122087.JPG",
      "alt": "Base Cabinet 323"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-323_P_1778666176716.JPG",
      "alt": "Base Cabinet 323 view 2"
    }
  ],
  "324": [
    {
      "url": "/assets/original-site/images-202605-source_img-324_P_1778666208433.JPG",
      "alt": "Wall Cabinet 324"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-324_P_1778666267055.JPG",
      "alt": "Wall Cabinet 324 view 2"
    }
  ],
  "325": [
    {
      "url": "/assets/original-site/images-202605-source_img-325_P_1778657182678.JPG",
      "alt": "Base Cabinet 325"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-325_P_1778657217013.JPG",
      "alt": "Base Cabinet 325 view 2"
    }
  ],
  "326": [
    {
      "url": "/assets/original-site/images-202605-source_img-326_P_1778657273865.JPG",
      "alt": "Wall Cabinet 326"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-326_P_1778657314401.JPG",
      "alt": "Wall Cabinet 326 view 2"
    }
  ],
  "327": [
    {
      "url": "/assets/original-site/images-202605-source_img-327_P_1778660279643.JPG",
      "alt": "Base Cabinet 327"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-327_P_1778660333075.JPG",
      "alt": "Base Cabinet 327 view 2"
    }
  ],
  "328": [
    {
      "url": "/assets/original-site/images-202605-source_img-328_P_1778662202119.JPG",
      "alt": "Wall Cabinet 328"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-328_P_1778662255591.JPG",
      "alt": "Wall Cabinet 328 view 2"
    }
  ],
  "329": [
    {
      "url": "/assets/original-site/images-202605-source_img-329_P_1778663953257.JPG",
      "alt": "Base Cabinet 329"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-329_P_1778664007518.JPG",
      "alt": "Base Cabinet 329 view 2"
    }
  ],
  "330": [
    {
      "url": "/assets/original-site/images-202605-source_img-330_P_1778660375337.JPG",
      "alt": "Wall Cabinet 330"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-330_P_1778660430195.JPG",
      "alt": "Wall Cabinet 330 view 2"
    }
  ],
  "331": [
    {
      "url": "/assets/original-site/images-202605-source_img-331_P_1778658349631.JPG",
      "alt": "Base Cabinet 331"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-331_P_1778658407576.JPG",
      "alt": "Base Cabinet 331 view 2"
    }
  ],
  "332": [
    {
      "url": "/assets/original-site/images-202605-source_img-332_P_1778661072598.JPG",
      "alt": "Wall Cabinet 332"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-332_P_1778661147649.JPG",
      "alt": "Wall Cabinet 332 view 2"
    }
  ],
  "333": [
    {
      "url": "/assets/original-site/images-202605-source_img-333_P_1778662951068.JPG",
      "alt": "Base Cabinet 333"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-333_P_1778663004271.JPG",
      "alt": "Base Cabinet 333 view 2"
    }
  ],
  "334": [
    {
      "url": "/assets/original-site/images-202605-source_img-334_P_1778658583256.JPG",
      "alt": "Wall Cabinet 334"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-334_P_1778658629274.JPG",
      "alt": "Wall Cabinet 334 view 2"
    }
  ],
  "335": [
    {
      "url": "/assets/original-site/images-202605-source_img-335_P_1778661280965.JPG",
      "alt": "Base Cabinet 335"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-335_P_1778661340242.JPG",
      "alt": "Base Cabinet 335 view 2"
    }
  ],
  "336": [
    {
      "url": "/assets/original-site/images-202605-source_img-336_P_1778663141871.JPG",
      "alt": "Wall Cabinet 336"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-336_P_1778663195815.JPG",
      "alt": "Wall Cabinet 336 view 2"
    }
  ],
  "337": [
    {
      "url": "/assets/original-site/images-202605-source_img-337_P_1778658975922.JPG",
      "alt": "Base Cabinet 337"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-337_P_1778659009397.JPG",
      "alt": "Base Cabinet 337 view 2"
    }
  ],
  "338": [
    {
      "url": "/assets/original-site/images-202605-source_img-338_P_1778661596490.JPG",
      "alt": "Wall Cabinet 338"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-338_P_1778661681261.JPG",
      "alt": "Wall Cabinet 338 view 2"
    }
  ],
  "339": [
    {
      "url": "/assets/original-site/images-202605-source_img-339_P_1778663403607.JPG",
      "alt": "Base Cabinet 339"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-339_P_1778663454746.JPG",
      "alt": "Base Cabinet 339 view 2"
    }
  ],
  "340": [
    {
      "url": "/assets/original-site/images-202605-source_img-340_P_1778659276583.JPG",
      "alt": "Wall Cabinet 340"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-340_P_1778659338567.JPG",
      "alt": "Wall Cabinet 340 view 2"
    }
  ],
  "341": [
    {
      "url": "/assets/original-site/images-202605-source_img-341_P_1778662343065.JPG",
      "alt": "Base Cabinet 341"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-341_P_1778662404546.JPG",
      "alt": "Base Cabinet 341 view 2"
    }
  ],
  "342": [
    {
      "url": "/assets/original-site/images-202605-source_img-342_P_1778663761464.JPG",
      "alt": "Wall Cabinet 342"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-342_P_1778663818891.JPG",
      "alt": "Wall Cabinet 342 view 2"
    }
  ],
  "343": [
    {
      "url": "/assets/original-site/images-202605-source_img-343_P_1778659060829.JPG",
      "alt": "Base Cabinet 343"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-343_P_1778659132956.JPG",
      "alt": "Base Cabinet 343 view 2"
    }
  ],
  "344": [
    {
      "url": "/assets/original-site/images-202605-source_img-344_P_1778661722545.JPG",
      "alt": "Wall Cabinet 344"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-344_P_1778661799179.JPG",
      "alt": "Wall Cabinet 344 view 2"
    }
  ],
  "345": [
    {
      "url": "/assets/original-site/images-202605-source_img-345_P_1778663489791.JPG",
      "alt": "Base Cabinet 345"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-345_P_1778663562638.JPG",
      "alt": "Base Cabinet 345 view 2"
    }
  ],
  "346": [
    {
      "url": "/assets/original-site/images-202605-source_img-346_P_1778668085611.JPG",
      "alt": "Wall Cabinet 346"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-346_P_1778668144675.JPG",
      "alt": "Wall Cabinet 346 view 2"
    }
  ],
  "347": [
    {
      "url": "/assets/original-site/images-202605-source_img-347_P_1778668180240.JPG",
      "alt": "Tall Cabinet 347"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-347_P_1778668186102.JPG",
      "alt": "Tall Cabinet 347 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-347_P_1778668234617.JPG",
      "alt": "Tall Cabinet 347 view 3"
    }
  ],
  "348": [
    {
      "url": "/assets/original-site/images-202605-source_img-348_P_1778668277532.JPG",
      "alt": "Wall Cabinet 348"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-348_P_1778668283332.JPG",
      "alt": "Wall Cabinet 348 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-348_P_1778668331395.JPG",
      "alt": "Wall Cabinet 348 view 3"
    }
  ],
  "349": [
    {
      "url": "/assets/original-site/images-202605-source_img-349_P_1778667364966.JPG",
      "alt": "Tall Cabinet 349"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-349_P_1778667375583.JPG",
      "alt": "Tall Cabinet 349 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-349_P_1778667397065.JPG",
      "alt": "Tall Cabinet 349 view 3"
    }
  ],
  "350": [
    {
      "url": "/assets/original-site/images-202605-source_img-350_P_1778667457985.JPG",
      "alt": "Wall Cabinet 350"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-350_P_1778667462659.JPG",
      "alt": "Wall Cabinet 350 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-350_P_1778667509179.JPG",
      "alt": "Wall Cabinet 350 view 3"
    }
  ],
  "351": [
    {
      "url": "/assets/original-site/images-202605-source_img-351_P_1778667548888.JPG",
      "alt": "Tall Cabinet 351"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-351_P_1778667554325.JPG",
      "alt": "Tall Cabinet 351 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-351_P_1778667599092.JPG",
      "alt": "Tall Cabinet 351 view 3"
    }
  ],
  "352": [
    {
      "url": "/assets/original-site/images-202605-source_img-352_P_1778668379911.JPG",
      "alt": "Wall Cabinet 352"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-352_P_1778668384629.JPG",
      "alt": "Wall Cabinet 352 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-352_P_1778668431619.JPG",
      "alt": "Wall Cabinet 352 view 3"
    }
  ],
  "353": [
    {
      "url": "/assets/original-site/images-202605-source_img-353_P_1778668472540.JPG",
      "alt": "Tall Cabinet 353"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-353_P_1778668483966.JPG",
      "alt": "Tall Cabinet 353 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-353_P_1778668533922.JPG",
      "alt": "Tall Cabinet 353 view 3"
    }
  ],
  "354": [
    {
      "url": "/assets/original-site/images-202605-source_img-354_P_1778668574069.JPG",
      "alt": "Wall Cabinet 354"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-354_P_1778668580437.JPG",
      "alt": "Wall Cabinet 354 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-354_P_1778668627729.JPG",
      "alt": "Wall Cabinet 354 view 3"
    }
  ],
  "355": [
    {
      "url": "/assets/original-site/images-202605-source_img-355_P_1778668668900.JPG",
      "alt": "Tall Cabinet 355"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-355_P_1778668691281.JPG",
      "alt": "Tall Cabinet 355 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-355_P_1778668746084.JPG",
      "alt": "Tall Cabinet 355 view 3"
    }
  ],
  "356": [
    {
      "url": "/assets/original-site/images-202605-source_img-356_P_1778668809938.JPG",
      "alt": "Wall Cabinet 356"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-356_P_1778668815123.JPG",
      "alt": "Wall Cabinet 356 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-356_P_1778668876401.JPG",
      "alt": "Wall Cabinet 356 view 3"
    }
  ],
  "357": [
    {
      "url": "/assets/original-site/images-202605-source_img-357_P_1778668916793.JPG",
      "alt": "Tall Cabinet 357"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-357_P_1778668923547.JPG",
      "alt": "Tall Cabinet 357 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-357_P_1778669008466.JPG",
      "alt": "Tall Cabinet 357 view 3"
    }
  ],
  "358": [
    {
      "url": "/assets/original-site/images-202605-source_img-358_P_1778669046342.JPG",
      "alt": "Wall Cabinet 358"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-358_P_1778669052528.JPG",
      "alt": "Wall Cabinet 358 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-358_P_1778669104388.JPG",
      "alt": "Wall Cabinet 358 view 3"
    }
  ],
  "359": [
    {
      "url": "/assets/original-site/images-202605-source_img-359_P_1778669142718.JPG",
      "alt": "Tall Cabinet 359"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-359_P_1778669147785.JPG",
      "alt": "Tall Cabinet 359 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-359_P_1778669192557.JPG",
      "alt": "Tall Cabinet 359 view 3"
    }
  ],
  "360": [
    {
      "url": "/assets/original-site/images-202605-source_img-360_P_1778669231918.JPG",
      "alt": "Wall Cabinet 360"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-360_P_1778669256375.JPG",
      "alt": "Wall Cabinet 360 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-360_P_1778669307398.JPG",
      "alt": "Wall Cabinet 360 view 3"
    }
  ],
  "361": [
    {
      "url": "/assets/original-site/images-202605-source_img-361_P_1778745870735.JPG",
      "alt": "Tall Cabinet 361"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-361_P_1778745927615.JPG",
      "alt": "Tall Cabinet 361 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-361_P_1778746041798.JPG",
      "alt": "Tall Cabinet 361 view 3"
    }
  ],
  "362": [
    {
      "url": "/assets/original-site/images-202605-source_img-362_P_1778746120014.JPG",
      "alt": "Wall Cabinet 362"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-362_P_1778746159697.JPG",
      "alt": "Wall Cabinet 362 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-362_P_1778746202961.JPG",
      "alt": "Wall Cabinet 362 view 3"
    }
  ],
  "363": [
    {
      "url": "/assets/original-site/images-202605-source_img-363_P_1778746254182.JPG",
      "alt": "Tall Cabinet 363"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-363_P_1778746283278.JPG",
      "alt": "Tall Cabinet 363 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-363_P_1778746331003.JPG",
      "alt": "Tall Cabinet 363 view 3"
    }
  ],
  "364": [
    {
      "url": "/assets/original-site/images-202605-source_img-364_P_1778746387101.JPG",
      "alt": "Wall Cabinet 364"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-364_P_1778746418225.JPG",
      "alt": "Wall Cabinet 364 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-364_P_1778746453512.JPG",
      "alt": "Wall Cabinet 364 view 3"
    }
  ],
  "365": [
    {
      "url": "/assets/original-site/images-202605-source_img-365_P_1778746501699.JPG",
      "alt": "Tall Cabinet 365"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-365_P_1778746530574.JPG",
      "alt": "Tall Cabinet 365 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-365_P_1778746572211.JPG",
      "alt": "Tall Cabinet 365 view 3"
    }
  ],
  "366": [
    {
      "url": "/assets/original-site/images-202605-source_img-366_P_1778746620025.JPG",
      "alt": "Wall Cabinet 366"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-366_P_1778746650412.JPG",
      "alt": "Wall Cabinet 366 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-366_P_1778746691329.JPG",
      "alt": "Wall Cabinet 366 view 3"
    }
  ],
  "368": [
    {
      "url": "/assets/original-site/images-202605-source_img-368_P_1778653528712.JPG",
      "alt": "Wall Cabinet 368"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-368_P_1778653602230.JPG",
      "alt": "Wall Cabinet 368 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-368_P_1778653614403.JPG",
      "alt": "Wall Cabinet 368 view 3"
    }
  ],
  "369": [
    {
      "url": "/assets/original-site/images-202605-source_img-369_P_1778654378424.JPG",
      "alt": "Tall Cabinet 369"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-369_P_1778654410080.JPG",
      "alt": "Tall Cabinet 369 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-369_P_1778654428302.JPG",
      "alt": "Tall Cabinet 369 view 3"
    }
  ],
  "370": [
    {
      "url": "/assets/original-site/images-202605-source_img-370_P_1778654687201.JPG",
      "alt": "Wall Cabinet 370"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-370_P_1778654795853.JPG",
      "alt": "Wall Cabinet 370 view 2"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-370_P_1778654842825.JPG",
      "alt": "Wall Cabinet 370 view 3"
    }
  ],
  "371": [
    {
      "url": "/assets/original-site/images-202605-source_img-371_P_1778670828368.JPG",
      "alt": "Base Cabinet 371"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-371_P_1778670841646.JPG",
      "alt": "Base Cabinet 371 view 2"
    }
  ],
  "372": [
    {
      "url": "/assets/original-site/images-202605-source_img-372_P_1778671110323.JPG",
      "alt": "Wall Cabinet 372"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-372_P_1778671140214.JPG",
      "alt": "Wall Cabinet 372 view 2"
    }
  ],
  "373": [
    {
      "url": "/assets/original-site/images-202605-source_img-373_P_1778671975832.JPG",
      "alt": "Base Cabinet 373"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-373_P_1778672012595.JPG",
      "alt": "Base Cabinet 373 view 2"
    }
  ],
  "374": [
    {
      "url": "/assets/original-site/images-202605-source_img-374_P_1778672309298.JPG",
      "alt": "Wall Cabinet 374"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-374_P_1778672341472.JPG",
      "alt": "Wall Cabinet 374 view 2"
    }
  ],
  "375": [
    {
      "url": "/assets/original-site/images-202605-source_img-375_P_1778672564329.JPG",
      "alt": "Base Cabinet 375"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-375_P_1778672572467.JPG",
      "alt": "Base Cabinet 375 view 2"
    }
  ],
  "376": [
    {
      "url": "/assets/original-site/images-202605-source_img-376_P_1778672747084.JPG",
      "alt": "Wall Cabinet 376"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-376_P_1778672787333.JPG",
      "alt": "Wall Cabinet 376 view 2"
    }
  ],
  "377": [
    {
      "url": "/assets/original-site/images-202605-source_img-377_P_1778830759663.JPG",
      "alt": "Base Cabinet 377"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-377_P_1778830822558.JPG",
      "alt": "Base Cabinet 377 view 2"
    }
  ],
  "378": [
    {
      "url": "/assets/original-site/images-202605-source_img-378_P_1778831049813.JPG",
      "alt": "Wall Cabinet 378"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-378_P_1778831058396.JPG",
      "alt": "Wall Cabinet 378 view 2"
    }
  ],
  "379": [
    {
      "url": "/assets/original-site/images-202605-source_img-379_P_1778831219140.JPG",
      "alt": "Base Cabinet 379"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-379_P_1778831228563.JPG",
      "alt": "Base Cabinet 379 view 2"
    }
  ],
  "380": [
    {
      "url": "/assets/original-site/images-202605-source_img-380_P_1778831266291.JPG",
      "alt": "Wall Cabinet 380"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-380_P_1778831314931.JPG",
      "alt": "Wall Cabinet 380 view 2"
    }
  ],
  "381": [
    {
      "url": "/assets/original-site/images-202605-source_img-381_P_1778831533057.JPG",
      "alt": "Base Cabinet 381"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-381_P_1778831553005.JPG",
      "alt": "Base Cabinet 381 view 2"
    }
  ],
  "382": [
    {
      "url": "/assets/original-site/images-202605-source_img-382_P_1778831629650.JPG",
      "alt": "Wall Cabinet 382"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-382_P_1778831643880.JPG",
      "alt": "Wall Cabinet 382 view 2"
    }
  ],
  "383": [
    {
      "url": "/assets/original-site/images-202605-source_img-383_P_1778831739491.JPG",
      "alt": "Base Cabinet 383"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-383_P_1778831751023.JPG",
      "alt": "Base Cabinet 383 view 2"
    }
  ],
  "384": [
    {
      "url": "/assets/original-site/images-202605-source_img-384_P_1779682456404.JPG",
      "alt": "Vanity Cabinet 384"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-384_P_1779682523208.JPG",
      "alt": "Vanity Cabinet 384 view 2"
    }
  ],
  "398": [
    {
      "url": "/assets/original-site/images-202606-source_img-398_P_1780884887561.JPG",
      "alt": "Vanity Cabinet 398"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-398_P_1780884893548.jpg",
      "alt": "Vanity Cabinet 398 view 2"
    }
  ],
  "400": [
    {
      "url": "/assets/original-site/images-202606-source_img-400_P_1780888348274.JPG",
      "alt": "Vanity Cabinet 400"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-400_P_1780888355109.jpg",
      "alt": "Vanity Cabinet 400 view 2"
    }
  ],
  "401": [
    {
      "url": "/assets/original-site/images-202605-source_img-401_P_1779876056378.JPG",
      "alt": "Vanity Cabinet 401"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-401_P_1779876074479.JPG",
      "alt": "Vanity Cabinet 401 view 2"
    }
  ],
  "402": [
    {
      "url": "/assets/original-site/images-202605-source_img-402_P_1779879191950.JPG",
      "alt": "Vanity Cabinet 402"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-402_P_1779879205827.JPG",
      "alt": "Vanity Cabinet 402 view 2"
    }
  ],
  "403": [
    {
      "url": "/assets/original-site/images-202605-source_img-403_P_1779952289354.JPG",
      "alt": "Vanity Cabinet 403"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-403_P_1779952302114.JPG",
      "alt": "Vanity Cabinet 403 view 2"
    }
  ],
  "404": [
    {
      "url": "/assets/original-site/images-202605-source_img-404_P_1779960416327.JPG",
      "alt": "Vanity Cabinet 404"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-404_P_1779960434320.JPG",
      "alt": "Vanity Cabinet 404 view 2"
    }
  ],
  "405": [
    {
      "url": "/assets/original-site/images-202605-source_img-405_P_1779962945881.JPG",
      "alt": "Vanity Cabinet 405"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-405_P_1779962963145.JPG",
      "alt": "Vanity Cabinet 405 view 2"
    }
  ],
  "406": [
    {
      "url": "/assets/original-site/images-202605-source_img-406_P_1779963118719.JPG",
      "alt": "Vanity Cabinet 406"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-406_P_1779963134821.JPG",
      "alt": "Vanity Cabinet 406 view 2"
    }
  ],
  "407": [
    {
      "url": "/assets/original-site/images-202605-source_img-407_P_1780215642366.JPG",
      "alt": "Baseboard 407"
    },
    {
      "url": "/assets/original-site/images-202605-source_img-407_P_1780215664315.JPG",
      "alt": "Baseboard 407 view 2"
    }
  ],
  "409": [
    {
      "url": "/assets/original-site/images-202606-source_img-409_P_1780467530017.JPG",
      "alt": "Primed MDF Moulding 409"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-409_P_1780467539816.JPG",
      "alt": "Primed MDF Moulding 409 view 2"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-409_P_1781592420504.JPG",
      "alt": "Primed MDF Moulding 409 view 3"
    }
  ],
  "410": [
    {
      "url": "/assets/original-site/images-202606-source_img-410_P_1780467394703.JPG",
      "alt": "Primed MDF Moulding 410"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-410_P_1780467402775.JPG",
      "alt": "Primed MDF Moulding 410 view 2"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-410_P_1780467409649.JPG",
      "alt": "Primed MDF Moulding 410 view 3"
    }
  ],
  "411": [
    {
      "url": "/assets/original-site/images-202606-source_img-411_P_1780469866242.JPG",
      "alt": "Door Stop 411"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-411_P_1780469874280.JPG",
      "alt": "Door Stop 411 view 2"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-411_P_1781592370659.JPG",
      "alt": "Door Stop 411 view 3"
    }
  ],
  "412": [
    {
      "url": "/assets/original-site/images-202606-source_img-412_P_1780891297024.jpg",
      "alt": "Vanity Cabinet 412"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-412_P_1780891297630.jpg",
      "alt": "Vanity Cabinet 412 view 2"
    }
  ],
  "413": [
    {
      "url": "/assets/original-site/images-202606-source_img-413_P_1780877456467.JPG",
      "alt": "Vanity Cabinet 413"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-413_P_1780891460713.JPG",
      "alt": "Vanity Cabinet 413 view 2"
    }
  ],
  "414": [
    {
      "url": "/assets/original-site/images-202606-source_img-414_P_1781138572786.JPG",
      "alt": "Vanity Cabinet 414"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-414_P_1781138587010.JPG",
      "alt": "Vanity Cabinet 414 view 2"
    }
  ],
  "415": [
    {
      "url": "/assets/original-site/images-202606-source_img-415_P_1780890678462.jpg",
      "alt": "Vanity Cabinet 415"
    },
    {
      "url": "/assets/original-site/images-202606-source_img-415_P_1780890741500.JPG",
      "alt": "Vanity Cabinet 415 view 2"
    }
  ]
} satisfies Record<string, Array<{ url: string; alt: string }>>;

export const originalSiteImageLibrary: Record<string, ImageAsset[]> = Object.fromEntries(
  Object.entries(originalSiteImages).map(([productId, images]) => [
    productId,
    images.map((image) => ({
      ...image,
      url: assetPath(image.url)
    }))
  ])
);
