class Sector():

    def __init__(self):
        self.type = 'circle'
        self.radius = 10

        self.start_radial = 0
        self.end_radial = 360
        self.inner_radius = 0

    def __str__(self):
        return '{}, {}'.format(self.type, self.radius)
