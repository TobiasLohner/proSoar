from prosoar.task.turnpoint import Turnpoint


class Task:

    def __init__(self):
        self.__list = []

        # type: fai, triangle, outreturn, goal, racing, aat, mixed, touring
        self.type = 'racing'

        self.distance = 0

        # aat_min_time (s)
        self.aat_min_time = 3 * 3600

        # start_max_speed (m/s), start_max_height (m)
        self.start_max_speed = 60
        self.start_max_height = 0

        # start_max_height_ref (AGL, MSL)
        self.start_max_height_ref = 'MSL'

        # finish_min_height (m)
        self.finish_min_height = 0
        self.finish_min_height_ref = 'AGL'

        # fai_finish rule
        self.fai_finish = 0

        self.min_points = 2
        self.max_points = 13
        self.homogeneous_tps = 0
        self.is_closed = 0
        self.task_scored = 0

    def __len__(self):
        return len(self.__list)

    def __iter__(self):
        return iter(self.__list)

    def append(self, tp):
        if not isinstance(tp, Turnpoint):
            raise TypeError("Turnpoint expected")

        self.__list.append(tp)
