// src/data/options.js
export const OPTIONS = [
  {
    subject: "Construction",
    items: [
      { id: "r-33-ipo-r22-roof-insulation",              name: "R-33 IPO R22 Roof Insulation",             price: 195.0,  description: "" },
      { id: "r-22-floor-insulation",                     name: "R-22 Floor Insulation",                    price: 225.0,  description: "" },
      { id: "r-13-wall-insulation",                      name: "R-13 Wall Insulation",                     price: 550.0,  description: "" },
      { id: "16-on-center-rafter-trusses",               name: "16\" on Center Rafter Trusses",            price: 1125.0, description: "" },
      { id: "dbl-trusses-on-16-on-centers",              name: "Dbl Trusses on 16\" on Centers",           price: 3295.0, description: "" },
      { id: "f-r-covered-porch-per-sq-ft",               name: "F/R Covered Porch (per sq ft)",            price: 42.0,   description: "" },
      { id: "omit-standard-porch-per-lf",                name: "Omit Standard Porch per LF",               price: -13.0,  description: "" },
      { id: "8-high-wd-slat-screen-painted-per-lf",      name: "8' High Wd Slat Screen Painted per LF",   price: 41.0,   description: "" },
      { id: "single-loft-12-wide",                       name: "Single Loft 12 Wide",                      price: 5500.0, description: "" },
      { id: "double-loft-12-ft-wide-models",             name: "Double Loft 12 ft wide models",            price: 9700.0, description: "" },
      { id: "single-loft-15-wide",                       name: "Single Loft 15 Wide",                      price: 5500.0, description: "" },
      { id: "19-32-plywood-t-g-floor-decking-per-sq-ft", name: "19/32\" Plywood T&G Floor Decking (per sq. ft.)", price: 0.95,  description: "" },
      { id: "add-axle",                                  name: "Add Axle",                                 price: 450.0,  description: "" },
      { id: "tray-ceiling-6",                            name: "Tray Ceiling 6'",                          price: 595.0,  description: "" },
      { id: "extended-hitch-ipo-std-length",             name: "Extended Hitch IPO Std Length",            price: 45.0,   description: "" },
      { id: "side-to-side-monoslope-12w-park",           name: "Side to Side Monoslope 12W Park",          price: 1750.0, description: "" },
      { id: "porch-post-2x6-cedar-wrapped",              name: "Porch Post 2x6 Cedar Wrapped",             price: 250.0,  description: "" },
      { id: "new-tires-per-number-of-axles",             name: "New Tires per Number of Axles",            price: 110.0,  description: "" },
      {
        id: "anniversary-energy-package-park",
        name: "ANNIVERSARY ENERGY PACKAGE PARK",
        price: 1500.0,
        description: "Includes Radiant Roof Decking IPO Std OSB, R-33, R22 Roof & Floor Insulation, R-13 IPO R-11 Wall Insulation",
        isPackage: true
      }
    ]
  },
  {
    subject: "Flooring",
    items: [
      { id: "omit-all-floor-covering-per-lf",            name: "Omit all Floor Covering (per LF)",         price: -8.9,  description: "" },
      { id: "flrshaw-coretec-ipo-std-carpet-per-sf",     name: "FlrShaw Coretec IPO STD Carpet (per SF)",  price: 9.0,   description: "" },
      { id: "floorshaw-coretec-plk-ipo-lino-per-sf",     name: "FloorShaw Coretec PLK IPO Lino (per SF)",  price: 9.0,   description: "" },
      { id: "lvt-endura-plis-plk-ipo-carpet-per-sf",      name: "LVT Endura Plis PLK IPO Carpet (per SF)",  price: 4.0,   description: "" }
    ]
  },
  {
    subject: "Plumbing Options",
    items: [
      { id: "outside-water-faucets-each",              name: "Outside water faucets (each)",           price: 60.0,   description: "" },
      { id: "prep-for-ductless-1head-ac-hp-split",      name: "Prep for Ductless 1head AC/HP Split",    price: 75.0,   description: "" },
      { id: "prep-for-ductless-2head-ac-hp-split",      name: "Prep for Ductless 2head AC/HP Split",    price: 130.0,  description: "" },
      { id: "prep-for-ductless-3head-ac-hp-split",      name: "Prep for Ductless 3head AC/HP Split",    price: 200.0,  description: "" },
      { id: "install-3-head-ductless-ac-heat-system",   name: "Install 3 Head Ductless AC/Heat System", price: 5210.0, description: "" },
      { id: "install-2-head-ductless-ac-heat-system",   name: "Install 2 Head Ductless AC/Heat System", price: 4525.0, description: "" },
      { id: "install-1-head-ductless-ac-heat-system",   name: "Install 1 Head Ductless AC/Heat System", price: 3270.0, description: "" },
      { id: "tankless-gas-water-heater",                name: "Tankless Gas Water Heater",              price: 1750.0, description: "" },
      { id: "tankless-propane-water-heater",            name: "Tankless Propane Water Heater",         price: 2299.0, description: "" },
      { id: "add-floor-ducts-registers-prep-for-air",   name: "Add Floor Ducts/Registers/Prep for Air",price: 375.0,  description: "" },
      { id: "furnace-40k-btu-gas-dwnflow-pm",           name: "Furnace 40K BTU Gas Dwnflow PM",        price: 1100.0, description: "" },
      { id: "30-gal-water-heater-ipo-20-gal",           name: "30 Gal Water Heater IPO 20 Gal",       price: 275.0,  description: "" }
    ]
  },
  {
    subject: "Cabinetry / Molding",
    items: [
      { id: "white-cabinet-doors-wood-stiles-aps",                     name: "White Cabinet Doors & Wood Stiles APS",           price: 250.0, description: "" },
      { id: "ozark-shadow-cabinets-wood-stiles-aps",                  name: "Ozark Shadow Cabinets & Wood Stiles APS",         price: 495.0, description: "" },
      { id: "ozark-wood-cabs-stiles-ipo-mdf-apx",                     name: "Ozark Wood Cabs & Stiles IPO MDF APX",           price: 700.0, description: "" },
      { id: "white-wood-cabs-stiles-ipo-mdf-apx",                     name: "White Wood Cabs & Stiles IPO MDF APX",           price: 955.0, description: "" },
      { id: "hickory-wood-cabs-stiles-ipo-mdf-apx",                   name: "Hickory Wood Cabs & Stiles IPO MDF APX",         price: 1695.0, description: "" },
      { id: "black-satin-cabinets-ipo-std-aps",                       name: "Black Satin Cabinets IPO STD APS",               price: 940.0, description: "" },
      { id: "6-door-linen-cabinet",                                   name: "6 door Linen cabinet",                           price: 750.0, description: "" },
      { id: "pantry-w-3-shelves",                                      name: "Pantry w 3 Shelves",                            price: 575.0, description: "" },
      { id: "linen-cabinet-above-toilet",                             name: "Linen Cabinet Above Toilet",                    price: 245.0, description: "" },
      { id: "bedroom-w-overhead-cabs",                                name: "Bedroom W/OVERHEAD Cabs",                       price: 525.0, description: "" },
      { id: "omit-std-entertainment-center",                          name: "Omit Std Entertainment Center",                price: -50.0, description: "" },
      { id: "76-ent-center-ipo-std-48-w-fireplace-opening",           name: "76\" Ent. Center IPO STD 48\" w/Fireplace Opening", price: 155.0, description: "" },
      { id: "nightstands-each",                                       name: "Nightstands each",                              price: 165.0, description: "" },
      { id: "plant-shelf-bedroom-closets-ea",                         name: "Plant Shelf Bedroom Closets Ea",                price: 400.0, description: "" },
      { id: "omit-park-bedroom-dresser",                              name: "Omit Park Bedroom Dresser",                     price: -50.0, description: "" },
      { id: "3-dr-linen-cab-per-print",                               name: "3 Dr Linen Cab (per print)",                   price: 455.0, description: "" },
      {
        id: "syp-trim-package",
        name: "SYP TRIM PACKAGE",
        price: 2250.0,
        description: "Includes SYP 3.5\" Base IPO STD 3.25\" MDF, SYP Int Door Jamb IPO STD MDF, SYP Window Trim IPO WHT MDF, SYP Shelf & Rod IPO STD MDF, 3-1/4\" Crown Molding",
        isPackage: true
      }
    ]
  },
  {
    subject: "Kitchen",
    items: [
      { id: "bnickel-uk3-pull-faucet-ipo-std",             name: "BNickel UK3 Pull Faucet IPO STD",           price: 115.0,  description: "" },
      { id: "2x4-rolling-island-on-casters",                name: "2x4 Rolling Island on Casters",              price: 750.0,  description: "" },
      { id: "upg-glass-mosaic-behind-range",                name: "Upg Glass/Mosaic Behind Range",              price: 365.0,  description: "" },
      { id: "glass-mosaic-tile-18-high-ipo-6-tile-per-lf",  name: "Glass/Mosaic Tile 18\" High IPO 6\" Tile (per LF)", price: 68.0, description: "" },
      { id: "glass-mosaic-bsplash-6-ipo-standard-per-lf",   name: "Glass/Mosaic Bsplash 6\" IPO Standard (per LF)", price: 12.0, description: "" },
      { id: "ceramic-18-high-bsplash-ipo-standard-6-per-lf",name: "Ceramic 18\" High Bsplash IPO Standard 6\" (per LF)", price: 18.0, description: "" },
      { id: "1-row-tile-accent-band-per-lf-any-color",      name: "1 Row Tile Accent Band (per LF) any color",   price: 28.0,  description: "" },
      { id: "s-s-uk3-farmhouse-sink-w-faucet",               name: "S/S UK3 Farmhouse Sink w/Faucet",             price: 655.0, description: "" },
      { id: "grunge-bckspl-ipo-std-per-lf",                  name: "Grunge Bckspl IPO STD (per LF)",              price: 5.0,   description: "" },
      { id: "grunge-bckspl-behind-range-ea",                 name: "Grunge Bckspl Behind Range (ea)",             price: 75.0,  description: "" },
      { id: "grunge-bckspl-18-high-per-lf",                  name: "Grunge Bckspl 18\" High (per LF)",             price: 15.0,  description: "" },
      { id: "18-high-syp-backsplash-per-lf",                 name: "18\" High SYP Backsplash (per LF)",           price: 150.0, description: "" },
      { id: "laminate-backsplash-ipo-tile-aps",              name: "Laminate Backsplash IPO Tile APS",            price: 50.0,  description: "" },
      { id: "backsplash-18-high-ipo-std-apx-per-lf",         name: "Backsplash 18\"High IPO STD APX (per LF)",     price: 24.0,  description: "" },
      { id: "grunge-bckspl-ipo-hp-lam-apx-per-lf",           name: "Grunge Bckspl IPO HP Lam APX (per LF)",       price: 10.0,  description: "" },
      { id: "grunge-bckspl-18-high-ipo-hp-lam-apx-per-lf",   name: "Grunge Bckspl 18\" High IPO HP Lam APX (per LF)", price: 30.0, description: "" },
      { id: "grunge-bckspl-behind-range-apx-ea",            name: "Grunge Bckspl Behind Range APX (ea)",         price: 100.0, description: "" },
      { id: "syp-backsplash-behind-range",                  name: "SYP Backsplash Behind Range",                 price: 50.0,  description: "" }
    ]
  },
  {
    subject: "Master Bath",
    items: [
      { id: "handicap-toilet",                             name: "Handicap Toilet",                             price: 175.0, description: "" },
      { id: "grab-bar",                                     name: "Grab Bar",                                   price: 100.0, description: "" },
      { id: "38-handicap-shower-ipo-48-shower",             name: "38\" Handicap Shower IPO 48\" Shower",         price: 1125.0, description: "" },
      { id: "tile-shower-48-w-door",                        name: "Tile Shower 48\" w/Door",                    price: 1000.0, description: "" },
      { id: "rainforest-shower-head-ipo-std",               name: "Rainforest Shower Head IPO STD",             price: 145.0, description: "" },
      { id: "add-rainforest-shower-head",                   name: "Add Rainforest Shower Head in addition to Standard", price: 355.0, description: "" },
      { id: "add-54-tub-shower-ipo-48-shower",              name: "Add 54\" Tub/Shower IPO 48\" Shower",         price: 149.0, description: "" },
      { id: "60-tile-shower-w-1-2-glass-pkg",               name: "60\"Tile Shower w/1/2 Glass Pkg",            price: 2500.0, description: "" },
      { id: "60-shwr-w-door-cer-tile-pkg",                  name: "60\" Shwr w/door & Cer Tile Pkg",            price: 2200.0, description: "" }
    ]
  },
  {
    subject: "Interior Options",
    items: [
      { id: "syp-32-high-wainscote-per-lf",                name: "SYP 32\" High Wainscote per LF",              price: 24.0,  description: "" },
      { id: "syp-t-g-ceiling-per-lf",                      name: "SYP T&G Ceiling per LF",                     price: 85.0,  description: "" },
      { id: "wood-ceiling-ipo-t-t",                        name: "Wood Ceiling IPO T&T",                       price: 2150.0,description: "" },
      { id: "6-white-shiplap-interior-walls-per-sf",       name: "6\" White Shiplap Interior Walls per SF",    price: 10.0, description: "" },
      { id: "6-syp-shiplap-int-walls-per-sf",              name: "6\" SYP Shiplap Int Walls per SF",           price: 5.0,  description: "" },
      { id: "black-pipe-handrail-to-loft",                 name: "Black Pipe Handrail to Loft",               price: 85.0, description: "" },
      { id: "plank-4x6-beam-across",                       name: "Plank 4x6 Beam Across",                     price: 195.0,description: "" },
      { id: "4-1-4-white-crown-thruout",                   name: "4-1/4\" White Crown Thruout",                price: 295.0,description: "" },
      { id: "shelf-30-black-pipe-and-plank",               name: "Shelf 30\" Black Pipe and Plank",            price: 105.0,description: "" }
    ]
  },
  {
    subject: "Appliance Options",
    items: [
      { id: "30-ss-gas-range-ipo-std-electric",            name: "30\" SS Gas Range IPO STD Electric",         price: 450.0,  description: "" },
      { id: "2b-cktop-ss-el-whirl-drwr-base",              name: "2B Cktop SS EL Whirl Drwr Base",            price: 1495.0, description: "" },
      { id: "ss-electric-smooth-cooktop-ipo-range",        name: "SS Electric Smooth Cooktop IPO Range",      price: 350.0,  description: "" },
      { id: "18-dishwasher",                               name: "18\" Dishwasher",                           price: 735.0,  description: "" },
      { id: "ss-18-dishwasher",                            name: "SS 18\" Dishwasher",                        price: 955.0,  description: "" },
      { id: "garbage-disposal",                            name: "Garbage Disposal",                         price: 180.0,  description: "" },
      { id: "black-microwave-over-range",                  name: "Black Microwave over Range",               price: 325.0,  description: "" },
      { id: "ss-microwave-over-range",                     name: "SS Microwave over Range",                  price: 400.0,  description: "" },
      { id: "white-appliance-fee",                         name: "White Appliance Fee",                      price: 50.0,   description: "" },
      { id: "underctr-15-wine-refrig",                     name: "UnderCtr 15\" Wine Refrig",                 price: 1095.0, description: "" },
      { id: "stonecrest-rangehood",                        name: "Stonecrest Rangehood",                      price: 200.0,  description: "" },
      { id: "18-cu-ft-ss-refrigerator-ipo-std-black",      name: "18 cu.ft. SS Refrigerator IPO STD Black",   price: 330.0,  description: "" },
      { id: "21cu-ft-sxs-ss-refrigerator-ipo-18cu-ft-black",name: "21CU FT SxS SS Refrigerator IPO 18CU FT Black", price: 900.0, description: "" },
      { id: "21cu-ft-sxs-black-refrigerator",              name: "21CU FT SxS Black Refrigerator",            price: 725.0,  description: "" },
      { id: "ice-maker-for-standard-refrigerator",         name: "Ice maker for standard refrigerator",       price: 130.0,  description: "" },
      { id: "plumb-only-for-icemaker",                     name: "Plumb only for icemaker",                   price: 55.0,   description: "" },
      { id: "24-front-load-stacking-washer-dryer-installed", name: "24\" Front Load Stacking Washer/Dryer Installed", price: 1825.0, description: "" },
      { id: "stacking-kit-for-front-load-washer-dryer",    name: "Stacking Kit for Front Load Washer/Dryer",  price: 125.0,  description: "" },
      { id: "ss-smooth-top-electric-range-ipo-std-black",  name: "SS Smooth top electric range IPO STD Black", price: 425.0,  description: "" },
      { id: "30-gas-range-ipo-std-electric-black",         name: "30\" Gas Range IPO STD Electric Black",     price: 400.0,  description: "" }
    ]
  },
  {
    subject: "Décor",
    items: [
      { id: "faux-wood-blind-ipo-std", name: "Faux Wood Blind IPO STD", price: 45.0, description: "" }
    ]
  },
  {
    subject: "Window Options",
    items: [
      { id: "add-window",                       name: "Add Window",                     price: 125.0,  description: "" },
      { id: "omit-window-pp",                   name: "Omit Window - PP",               price: -100.0, description: "" },
      { id: "transom-windows-ea",               name: "Transom Windows (EA)",           price: 265.0,  description: "" },
      { id: "add-pentizoid-window",             name: "Add Pentizoid Window",           price: 825.0,  description: "" },
      { id: "park-1-window-clerestory",         name: "Park 1 Window Clerestory",       price: 1350.0, description: "" },
      { id: "park-2-window-clerestory",         name: "Park 2 Window Clerestory",       price: 1700.0, description: "" },
      { id: "park-3-window-clerestory",         name: "Park 3 Window Clerestory",       price: 2200.0, description: "" },
      { id: "4-window-anglebay-ipo-boxbaypk",   name: "4 Window AngleBay IPO BoxBayPK", price: 900.0,  description: "" },
      { id: "46x61-window-ipo-30x61",           name: "46x61 Window IPO 30x61",         price: 200.0,  description: "" },
      { id: "46x61-window-ipo-36x61",           name: "46x61 Window IPO 36x61",         price: 75.0,   description: "" },
      { id: "72x15-transom-window",             name: "72x15 Transom Window",           price: 475.0,  description: "" },
      { id: "transom-4-pack-special",           name: "Transom 4 pack Special",         price: 825.0,  description: "" },
      { id: "transom-6-pack-special",           name: "Transom 6 Pack Special",         price: 1300.0, description: "" },
      { id: "5420-window-ipo-4615-transom",     name: "5420 Window IPO 4615 Transom",   price: 100.0,  description: "" },
      { id: "extend-loft-high-wall",            name: "Extend Loft High Wall",          price: 1650.0, description: "" },
      { id: "add-black-window",                 name: "Add Black Window",               price: 765.0,  description: "" },
      { id: "add-black-transom-window",         name: "Add Black Transom Window",       price: 500.0,  description: "" },
      { id: "black-windows-ipo-white",          name: "Black Windows IPO White",        price: 2700.0, description: "" }
    ]
  },
  {
    subject: "Furniture Options",
    items: [
      { id: "bunks-w-foam-mattress-made-pp", name: "Bunks w/Foam Mattress Made PP", price: 795.0, description: "" }
    ]
  },
  {
    subject: "Interior Doors",
    items: [
      { id: "pocket-door-ipo-none",                  name: "Pocket Door IPO None",                  price: 500.0, description: "" },
      { id: "pocket-door-ipo-swing-door",            name: "Pocket Door IPO Swing Door",            price: 325.0, description: "" },
      { id: "change-int-door-to-size-36",            name: "Change Int Door to Size 36\"",         price: 55.0,  description: "" },
      { id: "syp-door-ipo-craftsman-dr-park",        name: "SYP Door IPO Craftsman Dr. Park",       price: 375.0, description: "" },
      { id: "plank-rolling-barn-door",               name: "Plank Rolling Barn Door",               price: 545.0, description: "" },
      { id: "craftsman-rolling-barn-door-ipo-bifold",name: "Craftsman Rolling Barn Door IPO Bifold",price: 75.0,  description: "" },
      { id: "craftsman-rolling-barn-door-ipo-std",   name: "Craftsman Rolling Barn Door IPO STD",   price: 150.0, description: "" }
    ]
  },
  {
    subject: "Fireplaces",
    items: [
      { id: "electric-fireplace-insert-26",           name: "Electric Fireplace Insert 26\"",       price: 550.0,  description: "" },
      { id: "fireplace-wall-mount-touchtone",        name: "Fireplace Wall Mount Touchtone",       price: 1595.0, description: "" },
      { id: "ext-1-2-rock-fireplace-w-mantle",        name: "Ext 1/2 Rock Fireplace w/Mantle",      price: 4699.0, description: "" }
    ]
  },
  {
    subject: "Electrical Options",
    items: [
      { id: "50amp-brkr-w-cord",                      name: "50Amp   Brkr w/Cord",                  price: 275.0, description: "" },
      { id: "ceiling-fan-led-3-blade-bn-wht-blk",     name: "Ceiling Fan LED 3 Blade BN WHT/BLK",  price: 225.0, description: "" },
      { id: "wire-and-brace-for-ceiling-fan",         name: "Wire and brace for ceiling fan",      price: 65.0,  description: "" },
      { id: "wire-and-brace-for-ext-flood-light",     name: "Wire and brace for Ext. Flood Light", price: 75.0,  description: "" },
      { id: "tv-jack-each",                           name: "TV jack (each)",                      price: 50.0,  description: "" },
      { id: "extra-exterior-gfi-receptacle",          name: "Extra exterior GFI receptacle",       price: 100.0, description: "" },
      { id: "tv-jack-receptacle-sxs-w-blocking",      name: "TV Jack + Receptacle SxS w/Blocking",price: 125.0, description: "" },
      { id: "omit-ac-quick-disconnect-box",           name: "OMIT A/C Quick Disconnect Box",       price: -30.0, description: "" },
      { id: "phone-jack-each",                        name: "Phone jack (each)",                  price: 45.0,  description: "" },
      { id: "8-wire-thermostat",                      name: "8 Wire Thermostat",                  price: 40.0,  description: "" },
      { id: "add-interior-receptacle",                name: "Add Interior Receptacle",            price: 50.0,  description: "" },
      { id: "wire-prep-for-doorbell",                 name: "Wire Prep for Doorbell",             price: 75.0,  description: "" }
    ]
  },
  {
    subject: "Lighting Options",
    items: [
      { id: "4-inch-led-can-light-ea-pp",             name: "4\" LED Can Light  (ea.) PP",          price: 70.0,  description: "" },
      { id: "extra-outside-light",                    name: "Extra Outside Light",                price: 80.0,  description: "" },
      { id: "exterior-flood-light-ea",                name: "Exterior Flood Light EA",             price: 150.0, description: "" },
      { id: "directional-reading-light",              name: "Directional Reading Light",          price: 105.0, description: "" }
    ]
  },
  {
    subject: "Exterior Options",
    items: [
      { id: "color-metal-roof-ipo-std-galvalume-per-bl",        name: "Color Metal Roof IPO STD Galvalume per BL",           price: 4.0,    description: "" },
      { id: "painted-lap-osb-ipo-painted-smart-panel",         name: "Painted lap/OSB IPO Painted Smart Panel",              price: 1400.0, description: "" },
      { id: "stained-lap-osb-ipo-painted-smart-panel",         name: "Stained Lap /OSB IPO Painted Smart Panel",            price: 4900.0, description: "" },
      { id: "stained-cpnl-brdbatt-paint-sp-per-lf",            name: "Stained Cpnl Brd&Batt Paint SP (per LF)",             price: 2000.0, description: "" },
      { id: "painted-lap-osb-ipo-painted-smart-panel-2",       name: "Painted Lap/OSB IPO Painted Smart Panel",              price: 500.0,  description: "" },
      { id: "5-rows-lap-all-sides",                            name: "5 Rows Lap - All Sides",                              price: 1095.0, description: "" },
      { id: "painted-bdbatt-ipo-ptd-smart-panel",              name: "Painted Bd&Batt IPO Ptd Smart Panel",                 price: 675.0,  description: "" }
    ]
  },
  {
    subject: "Exterior Doors",
    items: [
      { id: "36x80-door-w-blinds-ipo-9lite",                   name: "36x80 Door w/Blinds IPO 9Lite",            price: 400.0, description: "" },
      { id: "patio-door-6",                                    name: "Patio Door 6'",                            price: 1425.0,description: "" },
      { id: "atrium-door-rated-wz1-only",                      name: "Atrium Door Rated  WZ1 Only",             price: 3695.0,description: "" },
      { id: "french-dr-pp-rated-wz1-only",                     name: "French Dr- PP- Rated WZ1 Only",           price: 3695.0,description: "" },
      { id: "patio-door-ipo-36x80-9-lite-white",               name: "Patio Door IPO 36x80 9 Lite White",       price: 400.0, description: "" },
      { id: "36-tx-staroak-ipo-9lite-wht",                     name: "36\" TX StarOak IPO 9LITE Wht",           price: 615.0, description: "" },
      { id: "tx-str-fbrglass-wdgrain-dr-oak",                  name: "TX Str Fbrglass Wdgrain DR Oak",         price: 1325.0,description: "" },
      { id: "tx-str-white-ipo-9-lite-white",                   name: "TX Str White IPO 9 Lite White",           price: 625.0, description: "" },
      { id: "add-34-x-76-9-lite-cottage-dr",                   name: "Add 34 X 76 9-Lite Cottage Dr",           price: 825.0, description: "" },
      { id: "door-36-w-built-in-blinds",                       name: "Door 36\" w/ built in blinds",            price: 1700.0,description: "" }
    ]
  },
  {
    subject: "Packages",
    items: [
      {
        id: "stainless-steel-park-appliance-package",
        name: "STAINLESS STEEL PARK APPLIANCE PACKAGE",
        price: 2000.0,
        description: "21CU FT SIDE BY SIDE REFRIGERATOR, CONVECTION MICROWAVE OVEN, 30\" SMOOTH COOK TOP, (2) POT & PAN DRAWERS UNDER COOK TOP, Brushed Nickel Spring Pull Faucet IPO STD",
        isPackage: true
      },
      {
        id: "stainless-steel-deluxe-park-appliance-package",
        name: "STAINLESS STEEL DELUXE PARK APPLIANCE PACKAGE",
        price: 1500.0,
        description: "21CU FT SIDE BY SIDE REFRIGERATOR, MICROWAVE OVER RANGE",
        isPackage: true
      },
      {
        id: "black-deluxe-park-appliance-package",
        name: "BLACK DELUXE PARK APPLIANCE PACKAGE",
        price: 1425.0,
        description: "21CU FT SIDE BY SIDE REFRIGERATOR, MICROWAVE OVER RANGE, SMOOTHTOP ELECTRIC RANGE",
        isPackage: true
      },
      {
        id: "gas-appliance-pkg-ss-park",
        name: "Gas Appliance Pkg SS Park",
        price: 2195.0,
        description: "Gas 4 Burner Cooktop SS, Pot & Pan Drawers, 21 cu ft SxS Refrigerator SS, Convection Microwave over Cooktop",
        isPackage: true
      },
      {
        id: "sportsman-lodge-package",
        name: "SPORTSMAN LODGE PACKAGE",
        price: 7250.0,
        description: "SYP Ceiling, Metal/Brushed Nickel Faucets, Hickory Cabinets and Wood Stiles, SYP Grooved Doors w/ Brushed Nickel Hinges, SYP Int. Door Jamb IPO Stained MDF, 3 Panel Craftsman Bifold Closet Doors, Brushed Nickel Door Knobs & Hinges, SYP Jamb & Cased Windows, 3-1/4\" Crown Molding, SYP Shelf & Rod IPO STD MDF, SYP Jamb & Cased Windows",
        isPackage: true
      },
      {
        id: "hang-10-park-package",
        name: "HANG 10 PARK PACKAGE",
        price: 1500.0,
        description: "10ft Flat Ceiling, 40\" Overhead Kitchen Cabinets, 4-1/4\" Crown Molding",
        isPackage: true
      },
      {
        id: "craftsman-trim-package",
        name: "Craftsman Trim Package",
        price: 295.0,
        description: "Craftsman Base Molding IPO STD, Craftsman CrownMolding IPO STD, Craftsman Int DoorTrim IPO STD, Craftsman Int WindTrim IPO STD",
        isPackage: true
      },
      {
        id: "blackout-exterior",
        name: "Blackout Exterior",
        price: 350.0,
        description: "Front Door, Exterior Water Heater Door, Drip Edge, Dryer Vent",
        isPackage: true
      }
    ]
  }
]; 