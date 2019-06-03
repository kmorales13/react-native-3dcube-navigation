import React from 'react';
import PropTypes from 'prop-types';
import {
	View,
	PanResponder,
	Animated,
	StyleSheet,
	Platform,
	Dimensions
} from 'react-native';

const PESPECTIVE = Platform.OS === 'ios' ? 2.38 : 1.5;
const TR_POSITION = Platform.OS === 'ios' ? 2 : 1.75;

const getChildrenArray = (children) => {
	const childrenArray = children && children.length ? children : [children];
	return childrenArray.filter((child) => !!child);
};

export default class CubeNavigationHorizontal extends React.PureComponent {
	constructor({ children, initialIndex, width }) {
		super();

		const widthSize = width || Dimensions.get('window').width;
		const childrenArray = getChildrenArray(children);

		this.state = {
			width: widthSize,
			currentPageIndex: initialIndex || 0,
			pagesWidth: childrenArray.map((_, idx) => widthSize * -idx)
		};
	}

	componentWillMount() {
		const { pagesWidth, currentPageIndex } = this.state;
		const initialValue = pagesWidth[currentPageIndex];
		this._animatedValue = new Animated.ValueXY();
		this._animatedValue.setValue({ x: initialValue, y: 0 });
		this._value = { x: initialValue, y: 0 };

		this._animatedValue.addListener((value) => {
			this._value = value;
		});

		this._panResponder = PanResponder.create({
			onMoveShouldSetResponderCapture: () => true,
			onMoveShouldSetResponderCapture: () => Math.abs(gestureState.dx) > 60,
			onMoveShouldSetPanResponderCapture: (evt, gestureState) =>
				Math.abs(gestureState.dx) > 60,
			onPanResponderGrant: (e, gestureState) => {
				this._animatedValue.stopAnimation();
				this._animatedValue.setOffset({ x: this._value.x, y: this._value.y });
			},
			onPanResponderMove: (e, gestureState) => {
				Animated.event([null, { dx: this._animatedValue.x }])(e, gestureState);

				// Avoid last movement
				this.lockLast = pagesWidth[pagesWidth.length - 1];

				if (this._value.x > pagesWidth[0] || this._value.x < this.lockLast) {
					this._animatedValue.setValue({ x: 0, y: 0 });
				}
			},
			onPanResponderRelease: (e, gestureState) => {
				const mod = gestureState.dx > 0 ? 200 : -200;
				const { pageWidth, pageIndex } = this._closest(this._value.x + mod);

				if (this.lockLast > pageWidth) return; //remove in the future

				this._animatedValue.flattenOffset({
					x: this._value.x,
					y: this._value.y
				});

				this._changePage(pageIndex);
			}
		});
	}

	/*
    @page: index
  */
	scrollTo = (pageIndex) => {
		this._changePage(pageIndex);
	};

	/*
  Private methods
  */
	_changePage = (pageIndex) => {
		const { currentPageIndex, pagesWidth } = this.state;
		const pageWidth = pagesWidth[pageIndex];

		if (pageWidth == null && typeof pageWidth !== 'number') {
			return;
		}

		if (currentPageIndex !== pageIndex) {
			this.setState({ currentPageIndex: pageIndex }, () => {
				this.props.onBeforePageChange(pageIndex);
			});
		}

		Animated.spring(this._animatedValue, {
			toValue: { x: pageWidth, y: 0 },
			friction: 3,
			tension: 0.6,
			useNativeDriver: true
		}).start(() => {
			if (currentPageIndex !== pageIndex) {
				this.props.onPageChange(pageIndex);
			}
		});
	};

	_getTransformsFor = (i) => {
		const { width } = this.state;
		const scrollX = this._animatedValue.x;
		const pageX = -width * i;

		const translateX = scrollX.interpolate({
			inputRange: [pageX - width, pageX, pageX + width],
			outputRange: [(-width - 1) / TR_POSITION, 0, (width + 1) / TR_POSITION],
			extrapolate: 'clamp'
		});

		const rotateY = scrollX.interpolate({
			inputRange: [pageX - width, pageX, pageX + width],
			outputRange: ['-60deg', '0deg', '60deg'],
			extrapolate: 'clamp'
		});

		const translateXAfterRotate = scrollX.interpolate({
			inputRange: [pageX - width, pageX, pageX + width],
			inputRange: [
				pageX - width,
				pageX - width + 0.1,
				pageX,
				pageX + width - 0.1,
				pageX + width
			],
			outputRange: [
				-width - 1,
				(-width - 1) / PESPECTIVE,
				0,
				(width + 1) / PESPECTIVE,
				+width + 1
			],
			extrapolate: 'clamp'
		});

		const opacity = scrollX.interpolate({
			inputRange: [
				pageX - width,
				pageX - width + 10,
				pageX,
				pageX + width - 250,
				pageX + width
			],
			outputRange: [0, 0.6, 1, 0.6, 0],
			extrapolate: 'clamp'
		});

		return {
			transform: [
				{ perspective: width },
				{ translateX },
				{ rotateY: rotateY },
				{ translateX: translateXAfterRotate }
			],
			opacity: opacity
		};
	};

	_renderChild = (child, i) => {
		return (
			<Animated.View
				style={[
					StyleSheet.absoluteFill,
					{ backgroundColor: 'transparent' },
					this._getTransformsFor(i)
				]}
				key={`child-${i}`}>
				{child}
			</Animated.View>
		);
	};

	_closest = (num) => {
		let minDiff = 1000;

		return this.state.pagesWidth.reduce((memo, pageWidth, i) => {
			const m = Math.abs(num - pageWidth);

			if (m < minDiff) {
				minDiff = m;
				memo.pageWidth = pageWidth;
				memo.pageIndex = i;
			}

			return memo;
		}, {});
	};

	render() {
		const { children, style } = this.props;

		return (
			<View
				style={[{ backgroundColor: 'black' }, style]}
				{...this._panResponder.panHandlers}>
				{getChildrenArray(children).map(this._renderChild)}
			</View>
		);
	}
}

CubeNavigationHorizontal.propTypes = {
	style: PropTypes.any,
	width: PropTypes.number,
	onPageChange: PropTypes.func,
	onBeforePageChange: PropTypes.func
};

CubeNavigationHorizontal.defaultProps = {
	onPageChange: () => {},
	onBeforePageChange: () => {}
};
