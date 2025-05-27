import React, { Component } from "react";
import axios from "axios";
import OpenSeadragon from "openseadragon";
import * as ZoneLayer from "annotorious-openseadragon";
import { getImageInfoURL } from "../../../model/iiif-util";
import SurfaceEditorToolbar from "./SurfaceEditorToolbar";
import SurfaceDetailCard from "./SurfaceDetailCard";
import ZonePopup from "./ZonePopup";
import TitleBar from "../TitleBar";
import { getSurfaceNames } from "../../../model/convert-facs";
import inside from "point-in-polygon-hao";

const fairCopy = window.fairCopy;

export default class SurfaceEditor extends Component {
  constructor() {
    super();
    this.state = {
      selectedTool: "select",
      selectedZone: null,
      selectedDOMElement: null,
      zones: [],
      zoneIntersectArray: [],
      subZones: [],
    };
  }

  clearSelection() {
    this.setState({
      ...this.state,
      selectedZone: null,
      selectedDOMElement: null,
      selectedTool: "select",
      subZones: [],
    });
  }

  componentDidMount() {
    const { facsDocument } = this.props;
    facsDocument.addUpdateListener(this.updateListener);
    fairCopy.ipcRegisterCallback("selectedZones", this.onSelectedZones);
  }

  componentWillUnmount() {
    if (this.viewer) {
      this.viewer.destroy();
    }
    const { facsDocument } = this.props;
    facsDocument.removeUpdateListener(this.updateListener);
    fairCopy.ipcRemoveListener("selectedZones", this.onSelectedZones);
  }

  onSelectedZones = (e, selectedZones) => {
    const { resourceEntry } = this.props;
    const facsID = resourceEntry.localID;

    const highlightedZones = [];
    for (const zoneID of selectedZones) {
      const idParts = zoneID.split("#");
      if (idParts[0] === facsID || idParts[0] === "") {
        const zoneID = idParts[1];
        highlightedZones.push(zoneID);
      }
    }

    this.zoneLayer.setHighlights(highlightedZones);
  };

  // listen for updates from other processes to the zones
  updateListener = () => {
    const { facsDocument, surfaceIndex, onChangeView } = this.props;
    const surface = facsDocument.getSurface(surfaceIndex);
    if (surface) {
      this.loadZones(surface);
    } else {
      // surface must have been deleted, switch to index view
      onChangeView(0, "index");
    }
  };

  loadZones(surface) {
    const { zones } = surface;
    this.zoneLayer.cancel();
    this.zoneLayer.setZones(zones);

    this.setState({
      ...this.state,
      zones,
      selectedZone: null,
      selectedDOMElement: null,
      zoneIntersectArray: this.makeZoneIntersectArray(zones),
    });
  }

  setSelectedZone(selectedZone, selectedDOMElement) {
    let subZones = [];
    if (selectedZone.id === null) {
      const { facsDocument, surfaceIndex } = this.props;
      const surface = facsDocument.getSurface(surfaceIndex);
      selectedZone.id = facsDocument.nextZoneID(surface.id);
      subZones = [selectedZone.id];
    }
    this.setState({
      ...this.state,
      selectedZone,
      selectedDOMElement,
      subZones,
    });
  }

  createOSD(el, tileSource) {
    this.viewer = OpenSeadragon({
      element: el,
      tileSources: tileSource,
      showNavigator: true,
      navigatorPosition: "BOTTOM_RIGHT",
      showHomeControl: false,
      showFullPageControl: false,
      showZoomControl: false,
    });

    this.zoneLayer = ZoneLayer(this.viewer, {});

    this.zoneLayer.on("zoneSelected", (selectedZone, selectedDOMElement) => {
      this.setSelectedZone(selectedZone, selectedDOMElement);
    });

    window.document.addEventListener("click", (evt) => {
      // This will get called after a zone that is selected is clicked again
      // I assume the first click is captured and then not propagated
      // So first make sure a zone is currently selected

      if (this.state.selectedZone) {
        const x = evt.clientX;
        const y = evt.clientY;
        console.log("Click position:", x, y);

        const webPoint = new OpenSeadragon.Point(x, y);
        const viewportPoint = this.viewer.viewport.pointFromPixel(webPoint);
        console.log("Viewport position:", viewportPoint.x, viewportPoint.y);
        // Convert from viewport coordinates to image coordinates.
        const imagePoint =
          this.viewer.viewport.windowToImageCoordinates(webPoint);
        console.log("Image position:", imagePoint.x, imagePoint.y);

        // Now iterate through the zone intersect array and make a list of polygons
        // that this point intersects
        const hits = [];
        for (let i = 0; i < this.state.zoneIntersectArray.length; i++) {
          let poly = this.state.zoneIntersectArray[i];
          if (inside([imagePoint.x, imagePoint.y], poly.points)) {
            hits.push(poly);
          }
        }

        // TODO: this is just a test
        // Now go through the list of hits and find the selected zone
        let uncheckedZones = hits.filter(
          (h) => !this.state.subZones.includes(h.id)
        );
        if (uncheckedZones.length === 0) {
          uncheckedZones = hits;
        }

        if (uncheckedZones.length > 0) {
          const newZone = uncheckedZones[0];
          const el = document.querySelector(`[data-id='${newZone.id}']`);
          // this.zoneLayer.setHighlights([newZone.id]);
          this.zoneLayer._annotationLayer.selectAnnotation(newZone.id);
          this.setSelectedZone(newZone, el);
          this.setState({
            ...this.state,
            subZones:
              newZone.id === this.state.selectedZone.id
                ? []
                : [...this.state.subZones, newZone.id],
          });
        }
      }
    });

    this.viewer.element.style.width = "100%";
  }

  initViewer = (el) => {
    if (!el) {
      this.viewer = null;
      this.overlay = null;
      return;
    }
    const { facsDocument, surfaceIndex } = this.props;
    const surface = facsDocument.getSurface(surfaceIndex);

    if (surface.type === "iiif") {
      const imageInfoURL = getImageInfoURL(surface);
      axios.get(imageInfoURL).then(
        (response) => {
          this.createOSD(el, response.data);
          this.loadZones(surface);
        },
        (err) => {
          console.log("Unable to load image: " + err);
        }
      );
    } else {
      const imageFileURL = `local://${surface.resourceEntryID}`;
      this.createOSD(el, { type: "image", url: imageFileURL });
      this.loadZones(surface);
    }
  };

  setSurfaceIndex = (nextIndex) => {
    const { facsDocument, onChangeView } = this.props;
    const nextSurface = facsDocument.getSurface(nextIndex);
    const viewMode = "detail";

    if (nextSurface.type === "iiif") {
      const imageInfoURL = getImageInfoURL(nextSurface);
      axios.get(imageInfoURL).then((response) => {
        const tileSource = response.data;
        this.viewer.open(tileSource);
        this.loadZones(nextSurface);
        onChangeView(nextIndex, viewMode);
      });
    } else {
      const imageFileURL = `local://${nextSurface.resourceEntryID}`;
      this.viewer.open({ type: "image", url: imageFileURL });
      this.loadZones(nextSurface);
      onChangeView(nextIndex, viewMode);
    }
  };

  onChangeTool = (tool) => {
    if (tool === "select") {
      this.zoneLayer.setDrawingEnabled(false);
      this.zoneLayer.cancel();
      this.setState({
        ...this.state,
        selectedZone: null,
        selectedDOMElement: null,
        selectedTool: "select",
      });
    } else {
      this.zoneLayer.setDrawingEnabled(true);
      if (tool === "rect" || tool === "polygon")
        this.zoneLayer.setDrawingTool(tool);
      this.setState({ ...this.state, selectedTool: tool });
    }
  };

  onSaveZone = () => {
    const { facsDocument, surfaceIndex } = this.props;
    const { selectedZone } = this.state;

    this.zoneLayer.save(selectedZone);
    const surface = facsDocument.getSurface(surfaceIndex);
    surface.zones = this.zoneLayer.getZones();
    facsDocument.save();

    this.zoneLayer.setDrawingEnabled(false);
    this.clearSelection();
  };

  onCancelZone = () => {
    this.zoneLayer.cancel();
    this.clearSelection();
  };

  onEraseZone = () => {
    const { facsDocument, surfaceIndex } = this.props;
    this.zoneLayer.removeSelectedZone();
    this.onCancelZone();
    const surface = facsDocument.getSurface(surfaceIndex);
    surface.zones = this.zoneLayer.getZones();
    facsDocument.save();
  };

  makeZoneIntersectArray = (zones) => {
    let arr = [];

    // Create Geojson like polygons
    zones.forEach((zone) => {
      if (zone.lrx) {
        // This is a rectangle
        arr.push({
          id: zone.id,
          points: [
            [
              [parseFloat(zone.ulx), parseFloat(zone.uly)],
              [parseFloat(zone.lrx), parseFloat(zone.uly)],
              [parseFloat(zone.lrx), parseFloat(zone.lry)],
              [parseFloat(zone.ulx), parseFloat(zone.lry)],
              [parseFloat(zone.ulx), parseFloat(zone.uly)],
            ],
          ],
          zone,
        });
      } else if (zone.points) {
        // This is a polygon
        let out = [[]];
        let points = zone.points.split(" ");
        points.forEach((point) => {
          const vals = point.split(",");
          out[0].push([parseFloat(vals[0]), parseFloat(vals[1])]);
        });
        out[out.length - 1].push(out[0][0]);

        arr.push({ id: zone.id, points: out, zone });
      }
    });

    return arr;
  };

  render() {
    const {
      resourceEntry,
      parentResource,
      isWindowed,
      facsDocument,
      surfaceIndex,
      onChangeView,
      onWindow,
      onEditSurfaceInfo,
      onResourceAction,
      currentView,
    } = this.props;
    const { selectedDOMElement, selectedZone, selectedTool } = this.state;
    const surface = facsDocument.getSurface(surfaceIndex);
    const surfaceNames = getSurfaceNames(surface);
    const facsID = resourceEntry.localID;
    const { isLoggedIn } = facsDocument.imageViewContext;
    const editable = facsDocument.isEditable();

    const onChangeZone = (name, value, error) => {
      if (!error) {
        const nextZone = { ...selectedZone };
        nextZone[name] = value;
        this.setState({ ...this.state, selectedZone: nextZone });
      }
    };

    const onChangeSurface = (name, value, error) => {
      if (!error) {
        const surface = facsDocument.getSurface(surfaceIndex);
        surface[name] = value;
        facsDocument.save();
        this.setState({ ...this.state });
      }
    };

    const onClickResource = () => {
      onChangeView(surfaceIndex, "index");
    };

    const onEditInfo = () => {
      onEditSurfaceInfo({
        resourceID: facsDocument.resourceID,
        surfaceID: surface.id,
        name: surfaceNames.title,
      });
    };

    return (
      <div id="SurfaceEditor">
        <div>
          <TitleBar
            resourceName={resourceEntry.name}
            onClickResource={onClickResource}
            surfaceName={surfaceNames.title}
            onResourceAction={onResourceAction}
            parentResource={parentResource}
            isImageWindow={isWindowed}
            isLoggedIn={isLoggedIn}
            currentView={currentView}
          ></TitleBar>
          <SurfaceEditorToolbar
            surfaceIndex={surfaceIndex}
            selectedTool={selectedTool}
            onChangeTool={this.onChangeTool}
            onChangeView={onChangeView}
            onEditSurfaceInfo={onEditInfo}
            editable={editable}
            onWindow={onWindow}
          ></SurfaceEditorToolbar>
        </div>
        <div className="editor">
          <SurfaceDetailCard
            facsDocument={facsDocument}
            facsID={facsID}
            surfaceIndex={surfaceIndex}
            onChange={onChangeSurface}
            changeSurfaceIndex={this.setSurfaceIndex}
            isWindowed={isWindowed}
          ></SurfaceDetailCard>
          <SeaDragonComponent
            initViewer={this.initViewer}
            isWindowed={isWindowed}
          ></SeaDragonComponent>
          <ZonePopup
            zone={selectedZone}
            anchorEl={selectedDOMElement}
            facsDocument={facsDocument}
            facsID={facsID}
            onChange={onChangeZone}
            onErase={this.onEraseZone}
            onSave={this.onSaveZone}
            onCancel={this.onCancelZone}
          ></ZonePopup>
        </div>
      </div>
    );
  }
}

class SeaDragonComponent extends Component {
  shouldComponentUpdate() {
    return false;
  }

  render() {
    const { initViewer, isWindowed } = this.props;

    const modeClass = isWindowed ? "windowed" : "full";

    return (
      <div
        className={`osd-viewer ${modeClass}`}
        ref={(el) => {
          initViewer(el);
        }}
      ></div>
    );
  }
}
