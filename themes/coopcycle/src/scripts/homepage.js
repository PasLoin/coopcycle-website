import 'core-js'

import _ from 'lodash'
import axios from 'axios'
import ngeohash from 'ngeohash'

window.initMap = function() {

  window._paq = window._paq || []

  const resultsContainer = document.getElementById('search-results')
  const spinnerEl = document.getElementById('spinner')
  const noResultsEl = document.getElementById('no-results')

  axios.get('/coopcycle.json')
    .then(response => {
      const instances = response.data

      const foodtechInstances = _.filter(instances, instance => instance.hasOwnProperty('coopcycle_url'))

      const autocomplete = new google.maps.places.Autocomplete(document.querySelector('#search'), {
        types: ['address'],
      })

      autocomplete.addListener('place_changed', function() {

        while (resultsContainer.firstChild) {
          resultsContainer.removeChild(resultsContainer.firstChild)
        }

        const place = autocomplete.getPlace()

        if (!place.geometry) {
          return
        }

        window._paq.push(['trackEvent', 'Homepage', 'searchAddress', place.formatted_address])

        const countryComponent = _.find(place.address_components, component => {
          return _.includes(component.types, 'country')
        })

        const countryCode = countryComponent.short_name.toLowerCase()

        const countryInstances = _.filter(foodtechInstances, instance => instance.country === countryCode)

        spinnerEl.classList.remove('d-none')
        noResultsEl.classList.add('d-none')

        const geohash = ngeohash.encode(place.geometry.location.lat(), place.geometry.location.lng(), 11)

        const promises = countryInstances.map(instance => {
          return axios.get(`${instance.coopcycle_url}/api/restaurants?coordinate=${place.geometry.location.lat()},${place.geometry.location.lng()}`)
        })

        Promise.allSettled(promises)
          .then(results => {

            spinnerEl.classList.add('d-none')

            const successfulResults = _.map(_.filter(results, result => {
              return result.status === 'fulfilled' && result.value.data['hydra:member'].length > 0
            }), result => result.value)

            if (successfulResults.length > 0) {
              successfulResults.forEach(response => {

                let tmp = document.createElement('a')
                tmp.href = response.config.url

                const instanceHostname = tmp.protocol + '//' + tmp.hostname

                const matchedInstance = _.find(countryInstances, instance => instance.coopcycle_url === instanceHostname)

                // <a href="#" class="list-group-item list-group-item-action">Dapibus ac facilisis in</a>

                const aElement = document.createElement('a')
                aElement.classList.add(
                  'list-group-item',
                  'list-group-item-action',
                  'd-flex',
                  'justify-content-between',
                  'align-items-center',
                  'font-weight-bold'
                )
                aElement.href = `${matchedInstance.coopcycle_url}/fr/restaurants?geohash=${geohash}`
                aElement.innerHTML = `${matchedInstance.name} <i class="fa fa-external-link"></i>`
                aElement.target = '_blank'

                resultsContainer.appendChild(aElement)
              })
            } else {
              noResultsEl.classList.remove('d-none')
            }
          })
      })
    })
}