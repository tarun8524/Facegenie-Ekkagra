// Static hierarchical location data structure
export const locationData = {
  North: {
    center: { lat: 28.7041, lng: 77.1025 },
    zoom: 6,
    states: {
      Delhi: {
        center: { lat: 28.7041, lng: 77.1025 },
        zoom: 11,
        cities: {
          "New Delhi": {
            center: { lat: 28.6139, lng: 77.2090 },
            zoom: 12,
            stores: [
              { id: "ND1", name: "Delhi Store 01", lat: 28.6139, lng: 77.2090 },
              { id: "ND2", name: "Delhi Store 02", lat: 28.6289, lng: 77.2195 },
              { id: "ND3", name: "Delhi Store 03", lat: 28.5989, lng: 77.1985 }
            ]
          },
          Gurgaon: {
            center: { lat: 28.4595, lng: 77.0266 },
            zoom: 12,
            stores: [
              { id: "GG1", name: "Gurgaon Store 01", lat: 28.4595, lng: 77.0266 },
              { id: "GG2", name: "Gurgaon Store 02", lat: 28.4700, lng: 77.0350 }
            ]
          }
        }
      },
      Punjab: {
        center: { lat: 31.1471, lng: 75.3412 },
        zoom: 8,
        cities: {
          Chandigarh: {
            center: { lat: 30.7333, lng: 76.7794 },
            zoom: 12,
            stores: [
              { id: "CH1", name: "Chandigarh Store 01", lat: 30.7333, lng: 76.7794 },
              { id: "CH2", name: "Chandigarh Store 02", lat: 30.7433, lng: 76.7894 }
            ]
          },
          Ludhiana: {
            center: { lat: 30.9010, lng: 75.8573 },
            zoom: 12,
            stores: [
              { id: "LD1", name: "Ludhiana Store 01", lat: 30.9010, lng: 75.8573 },
              { id: "LD2", name: "Ludhiana Store 02", lat: 30.9110, lng: 75.8673 },
              { id: "LD3", name: "Ludhiana Store 03", lat: 30.8910, lng: 75.8473 }
            ]
          }
        }
      },
      Haryana: {
        center: { lat: 29.0588, lng: 76.0856 },
        zoom: 8,
        cities: {
          Faridabad: {
            center: { lat: 28.4089, lng: 77.3178 },
            zoom: 12,
            stores: [
              { id: "FB1", name: "Faridabad Store 01", lat: 28.4089, lng: 77.3178 },
              { id: "FB2", name: "Faridabad Store 02", lat: 28.4189, lng: 77.3278 },
              { id: "FB3", name: "Faridabad Store 03", lat: 28.3989, lng: 77.3078 }
            ]
          }
        }
      }
    }
  },
  South: {
    center: { lat: 13.0843, lng: 80.2705 },
    zoom: 6,
    states: {
      "Tamil Nadu": {
        center: { lat: 13.0843, lng: 80.2705 },
        zoom: 8,
        cities: {
          Chennai: {
            center: { lat: 13.0843, lng: 80.2705 },
            zoom: 11,
            stores: [
              { id: "TN1", name: "Chennai Store 01 - Iyyappanthangal", lat: 13.0395, lng: 80.1335 },
              { id: "TN2", name: "Chennai Store 02 - Nolambur", lat: 13.0780, lng: 80.1713 },
              { id: "TN3", name: "Chennai Store 03 - Madhavaram", lat: 13.1346, lng: 80.2389 }
            ]
          },
          Coimbatore: {
            center: { lat: 11.0168, lng: 76.9558 },
            zoom: 12,
            stores: [
              { id: "CB1", name: "Coimbatore Store 01", lat: 11.0168, lng: 76.9558 },
              { id: "CB2", name: "Coimbatore Store 02", lat: 11.0268, lng: 76.9658 }
            ]
          }
        }
      },
      Karnataka: {
        center: { lat: 12.9716, lng: 77.5946 },
        zoom: 8,
        cities: {
          Bangalore: {
            center: { lat: 12.9716, lng: 77.5946 },
            zoom: 11,
            stores: [
              { id: "BG1", name: "Bangalore Store 01", lat: 12.9716, lng: 77.5946 },
              { id: "BG2", name: "Bangalore Store 02", lat: 12.9816, lng: 77.6046 },
              { id: "BG3", name: "Bangalore Store 03", lat: 12.9616, lng: 77.5846 }
            ]
          },
          Mysore: {
            center: { lat: 12.2958, lng: 76.6394 },
            zoom: 12,
            stores: [
              { id: "MY1", name: "Mysore Store 01", lat: 12.2958, lng: 76.6394 },
              { id: "MY2", name: "Mysore Store 02", lat: 12.3058, lng: 76.6494 }
            ]
          }
        }
      },
      Kerala: {
        center: { lat: 10.8505, lng: 76.2711 },
        zoom: 8,
        cities: {
          Kochi: {
            center: { lat: 9.9312, lng: 76.2673 },
            zoom: 12,
            stores: [
              { id: "KC1", name: "Kochi Store 01", lat: 9.9312, lng: 76.2673 },
              { id: "KC2", name: "Kochi Store 02", lat: 9.9412, lng: 76.2773 },
              { id: "KC3", name: "Kochi Store 03", lat: 9.9212, lng: 76.2573 }
            ]
          }
        }
      }
    }
  },
  East: {
    center: { lat: 22.5726, lng: 88.3639 },
    zoom: 6,
    states: {
      "West Bengal": {
        center: { lat: 22.5726, lng: 88.3639 },
        zoom: 8,
        cities: {
          Kolkata: {
            center: { lat: 22.5726, lng: 88.3639 },
            zoom: 11,
            stores: [
              { id: "KL1", name: "Kolkata Store 01", lat: 22.5726, lng: 88.3639 },
              { id: "KL2", name: "Kolkata Store 02", lat: 22.5826, lng: 88.3739 },
              { id: "KL3", name: "Kolkata Store 03", lat: 22.5626, lng: 88.3539 }
            ]
          },
          Durgapur: {
            center: { lat: 23.5204, lng: 87.3119 },
            zoom: 12,
            stores: [
              { id: "DG1", name: "Durgapur Store 01", lat: 23.5204, lng: 87.3119 },
              { id: "DG2", name: "Durgapur Store 02", lat: 23.5304, lng: 87.3219 }
            ]
          }
        }
      },
      Bihar: {
        center: { lat: 25.5941, lng: 85.1376 },
        zoom: 8,
        cities: {
          Patna: {
            center: { lat: 25.5941, lng: 85.1376 },
            zoom: 12,
            stores: [
              { id: "PT1", name: "Patna Store 01", lat: 25.5941, lng: 85.1376 },
              { id: "PT2", name: "Patna Store 02", lat: 25.6041, lng: 85.1476 },
              { id: "PT3", name: "Patna Store 03", lat: 25.5841, lng: 85.1276 }
            ]
          }
        }
      },
      Odisha: {
        center: { lat: 20.9517, lng: 85.0985 },
        zoom: 8,
        cities: {
          Bhubaneswar: {
            center: { lat: 20.2961, lng: 85.8245 },
            zoom: 12,
            stores: [
              { id: "BH1", name: "Bhubaneswar Store 01", lat: 20.2961, lng: 85.8245 },
              { id: "BH2", name: "Bhubaneswar Store 02", lat: 20.3061, lng: 85.8345 }
            ]
          },
          Cuttack: {
            center: { lat: 20.5124, lng: 85.8830 },
            zoom: 12,
            stores: [
              { id: "CT1", name: "Cuttack Store 01", lat: 20.5124, lng: 85.8830 },
              { id: "CT2", name: "Cuttack Store 02", lat: 20.5224, lng: 85.8930 },
              { id: "CT3", name: "Cuttack Store 03", lat: 20.5024, lng: 85.8730 }
            ]
          }
        }
      }
    }
  },
  West: {
    center: { lat: 19.0760, lng: 72.8777 },
    zoom: 6,
    states: {
      Maharashtra: {
        center: { lat: 19.0760, lng: 72.8777 },
        zoom: 8,
        cities: {
          Mumbai: {
            center: { lat: 19.0760, lng: 72.8777 },
            zoom: 11,
            stores: [
              { id: "MB1", name: "Mumbai Store 01", lat: 19.0760, lng: 72.8777 },
              { id: "MB2", name: "Mumbai Store 02", lat: 19.0860, lng: 72.8877 },
              { id: "MB3", name: "Mumbai Store 03", lat: 19.0660, lng: 72.8677 }
            ]
          },
          Pune: {
            center: { lat: 18.5204, lng: 73.8567 },
            zoom: 12,
            stores: [
              { id: "PN1", name: "Pune Store 01", lat: 18.5204, lng: 73.8567 },
              { id: "PN2", name: "Pune Store 02", lat: 18.5304, lng: 73.8667 }
            ]
          }
        }
      },
      Gujarat: {
        center: { lat: 22.2587, lng: 71.1924 },
        zoom: 8,
        cities: {
          Ahmedabad: {
            center: { lat: 23.0225, lng: 72.5714 },
            zoom: 12,
            stores: [
              { id: "AH1", name: "Ahmedabad Store 01", lat: 23.0225, lng: 72.5714 },
              { id: "AH2", name: "Ahmedabad Store 02", lat: 23.0325, lng: 72.5814 },
              { id: "AH3", name: "Ahmedabad Store 03", lat: 23.0125, lng: 72.5614 }
            ]
          }
        }
      },
      Rajasthan: {
        center: { lat: 27.0238, lng: 74.2179 },
        zoom: 8,
        cities: {
          Jaipur: {
            center: { lat: 26.9124, lng: 75.7873 },
            zoom: 12,
            stores: [
              { id: "JP1", name: "Jaipur Store 01", lat: 26.9124, lng: 75.7873 },
              { id: "JP2", name: "Jaipur Store 02", lat: 26.9224, lng: 75.7973 }
            ]
          },
          Udaipur: {
            center: { lat: 24.5854, lng: 73.7125 },
            zoom: 12,
            stores: [
              { id: "UD1", name: "Udaipur Store 01", lat: 24.5854, lng: 73.7125 },
              { id: "UD2", name: "Udaipur Store 02", lat: 24.5954, lng: 73.7225 },
              { id: "UD3", name: "Udaipur Store 03", lat: 24.5754, lng: 73.7025 }
            ]
          }
        }
      }
    }
  }
};